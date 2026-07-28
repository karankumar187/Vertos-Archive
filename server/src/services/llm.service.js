'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const OpenAI = require('openai');

// ── Re-use the existing hardened OpenAI client from openai.service ────────
const { openaiClient } = require('./openai.service');

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
    baseURL: 'https://api-inference.huggingface.co/v1/',
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
 * If confidence is high, it returns all available free providers followed by OpenAI.
 * If confidence is low, it returns only OpenAI.
 *
 * @param {number} confidence — output of computeConfidence()
 * @returns {Array<{ id: string, client: OpenAI, model: string, providerName: string }>}
 */
const getProvidersWaterfall = (confidence) => {
    const threshold = parseFloat(process.env.LLM_CONFIDENCE_THRESHOLD ?? String(DEFAULT_CONFIDENCE_THRESHOLD));
    const waterfall = [];

    // Only add free providers if confidence meets threshold
    if (confidence >= threshold) {
        if (process.env.OPENROUTER_API_KEY) {
            waterfall.push({ id: 'openrouter', client: openRouterClient, model: 'openrouter/free', providerName: 'OpenRouter' });
        }
        if (process.env.GROQ_API_KEY) {
            waterfall.push({ id: 'groq', client: groqClient, model: 'llama-3.1-8b-instant', providerName: 'Groq' });
        }
        if (process.env.HF_API_KEY) {
            waterfall.push({ id: 'huggingface', client: hfClient, model: 'meta-llama/Meta-Llama-3-8B-Instruct', providerName: 'HuggingFace' });
        }
        if (process.env.MISTRAL_API_KEY) {
            waterfall.push({ id: 'mistral', client: mistralClient, model: 'open-mistral-nemo', providerName: 'Mistral' });
        }
    }

    // Always append OpenAI as the final fallback (or the only option if confidence is low)
    waterfall.push({ id: 'openai', client: openaiClient, model: OPENAI_MODEL, providerName: 'OpenAI' });

    return waterfall;
};

// ---------------------------------------------------------------------------
// createThinkFilter
// ---------------------------------------------------------------------------
const createThinkFilter = () => {
    let buffer      = '';
    let sawOpen     = false;  // saw <think>
    let done        = false;  // no more filtering needed

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
            const out = buffer;
            buffer = '';
            return out;
        }

        return '';
    };
};

module.exports = {
    computeConfidence,
    getProvidersWaterfall,
    createThinkFilter,
    openaiClient,
};
