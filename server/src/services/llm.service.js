'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const OpenAI = require('openai');

// ── Re-use the existing hardened OpenAI client from openai.service ────────
const { openaiClient } = require('./openai.service');
const { getSettings }  = require('./llmSettings.service');

// ── Free Provider Clients (OpenAI-compatible) ───────────────────────────
const openRouterClient = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || 'dummy-key',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': process.env.CLIENT_URL || 'https://vertos.app',
        'X-Title': 'Vertos Archive',
    },
    maxRetries: 0, // Disable internal retries so waterfall moves to next provider quickly
});

const groqClient = new OpenAI({
    apiKey: process.env.GROQ_API_KEY || 'dummy-key',
    baseURL: 'https://api.groq.com/openai/v1',
    maxRetries: 0,
});


const hfClient = new OpenAI({
    apiKey: process.env.HF_API_KEY || 'dummy-key',
    baseURL: 'https://router.huggingface.co/nscale/v1/',
    maxRetries: 0,
});

const mistralClient = new OpenAI({
    apiKey: process.env.MISTRAL_API_KEY || 'dummy-key',
    baseURL: 'https://api.mistral.ai/v1',
    maxRetries: 0,
});

const OPENAI_MODEL = 'gpt-4o-mini';

// Fraction of chunks that must exceed this cosine score to count as "covered"
const COVERAGE_THRESHOLD = 0.40;

// Default confidence cutoff (overridable via .env LLM_CONFIDENCE_THRESHOLD)
const DEFAULT_CONFIDENCE_THRESHOLD = 0.45;

// Circuit breaker state to prevent cascading delays when rate limited
const providerCooldowns = {};

const markProviderFailure = (providerId) => {
    if (providerId === 'openai') return; // Never cooldown our ultimate fallback
    console.warn(`[LLM Router] ${providerId} placed on 20s cooldown due to failure.`);
    providerCooldowns[providerId] = Date.now() + 20000;
};

// ---------------------------------------------------------------------------
// computeConfidence
// ---------------------------------------------------------------------------
const computeConfidence = (searchResults = []) => {
    if (!searchResults || searchResults.length === 0) return 0;

    const top1Score = searchResults[0]?.vectorScore ?? 0;

    const top5 = searchResults.slice(0, 5);
    const avgTop5 = top5.length > 0
        ? top5.reduce((sum, r) => sum + (r.vectorScore ?? 0), 0) / top5.length
        : 0;

    const aboveThreshold = searchResults.filter(r => (r.vectorScore ?? 0) >= COVERAGE_THRESHOLD).length;
    const coverageScore  = aboveThreshold / searchResults.length;

    const confidence = (0.5 * top1Score) + (0.3 * avgTop5) + (0.2 * coverageScore);
    return Math.min(1, Math.max(0, confidence));
};

// ---------------------------------------------------------------------------
// getProvidersWaterfall
// ---------------------------------------------------------------------------
/**
 * Returns an ordered array of LLM providers to try.
 *
 * Routing mode (from admin settings):
 *  - 'waterfall'     — fixed priority order: OpenRouter → Groq → HuggingFace → Mistral → OpenAI
 *  - 'load-balance'  — free providers are randomly shuffled to spread traffic evenly
 *
 * Disabled providers (toggled off in admin panel) are always skipped.
 * Providers on cooldown (circuit breaker) are always skipped.
 * OpenAI is always appended last as the ultimate fallback.
 *
 * @param {number} confidence — output of computeConfidence()
 * @returns {Array<{ id: string, client: OpenAI, model: string, providerName: string }>}
 */
const getProvidersWaterfall = (confidence) => {
    const { routingMode, confidenceThreshold, providerEnabled } = getSettings();
    const threshold = confidenceThreshold;
    const waterfall = [];

    // Only add free providers if confidence meets threshold and they are not on cooldown
    if (confidence >= threshold) {
        const now = Date.now();
        const freeProviders = [];

        if (process.env.OPENROUTER_API_KEY && providerEnabled.openrouter && (!providerCooldowns['openrouter'] || now > providerCooldowns['openrouter'])) {
            freeProviders.push({ id: 'openrouter', client: openRouterClient, model: 'openrouter/free', providerName: 'OpenRouter' });
        }
        if (process.env.GROQ_API_KEY && providerEnabled.groq && (!providerCooldowns['groq'] || now > providerCooldowns['groq'])) {
            freeProviders.push({ id: 'groq', client: groqClient, model: 'llama-3.1-8b-instant', providerName: 'Groq' });
        }
        if (process.env.HF_API_KEY && providerEnabled.huggingface && (!providerCooldowns['huggingface'] || now > providerCooldowns['huggingface'])) {
            freeProviders.push({ id: 'huggingface', client: hfClient, model: 'meta-llama/Llama-3.1-8B-Instruct', providerName: 'HuggingFace' });
        }
        if (process.env.MISTRAL_API_KEY && providerEnabled.mistral && (!providerCooldowns['mistral'] || now > providerCooldowns['mistral'])) {
            freeProviders.push({ id: 'mistral', client: mistralClient, model: 'open-mistral-nemo', providerName: 'Mistral' });
        }

        // In load-balance mode, shuffle the free providers randomly
        if (routingMode === 'load-balance' && freeProviders.length > 1) {
            for (let i = freeProviders.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [freeProviders[i], freeProviders[j]] = [freeProviders[j], freeProviders[i]];
            }
            console.log(`[LLM Router] Load-balance mode — order: ${freeProviders.map(p => p.providerName).join(' → ')}`);
        }

        waterfall.push(...freeProviders);
    }

    // Always append OpenAI as the final fallback (or the only option if confidence is low)
    waterfall.push({ id: 'openai', client: openaiClient, model: OPENAI_MODEL, providerName: 'OpenAI' });

    return waterfall;
};

// ---------------------------------------------------------------------------
// createThinkFilter
// ---------------------------------------------------------------------------
/**
 * Streaming token filter for non-OpenAI models.
 * Strips:
 *  1. <think>...</think> reasoning blocks emitted by some models.
 *  2. OpenRouter safety-classifier metadata lines that appear before the
 *     actual answer, e.g.:
 *       "User Safety: safe\nResponse Safety: safe\n"
 */
const createThinkFilter = () => {
    let buffer      = '';
    let sawOpen     = false;  // saw <think>
    let done        = false;  // no more filtering needed

    // Regex that matches one or more OpenRouter safety-metadata lines at the
    // very start of the buffered text.
    const SAFETY_PREFIX_RE = /^(\s*(User Safety|Response Safety|Input Safety|Output Safety)\s*:\s*\S+\s*\n?)+/i;

    return (rawToken) => {
        if (done) return rawToken;

        buffer += rawToken;

        // Detect think-block opening
        if (!sawOpen && buffer.includes('<think>')) {
            sawOpen = true;
        }

        if (sawOpen) {
            // Wait for closing tag
            const closeIdx = buffer.indexOf('</think>');
            if (closeIdx !== -1) {
                done = true;
                const after = buffer.slice(closeIdx + '</think>'.length).replace(/^\n+/, '');
                buffer = '';
                return after;
            }
            return '';
        }

        if (buffer.length >= 20) {
            done = true;
            // Strip any leading OpenRouter safety metadata before flushing
            const cleaned = buffer.replace(SAFETY_PREFIX_RE, '');
            buffer = '';
            return cleaned;

        }

        return '';
    };
};

module.exports = {
    computeConfidence,
    getProvidersWaterfall,
    createThinkFilter,
    markProviderFailure,
    openaiClient,
};
