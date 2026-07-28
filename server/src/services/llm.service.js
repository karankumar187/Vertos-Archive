'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const OpenAI = require('openai');

// ── Re-use the existing hardened OpenAI client from openai.service ────────
const { openaiClient } = require('./openai.service');

// ── Qwen client via OpenRouter (OpenAI-compatible) ────────────────────────
const qwenClient = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': process.env.CLIENT_URL || 'https://vertos.app',
        'X-Title': 'Vertos Archive',
    },
    maxRetries: 2,
});

const OPENAI_MODEL = 'gpt-4o-mini';
const FREE_MODEL   = 'google/gemma-4-31b-it:free';

// Fraction of chunks that must exceed this cosine score to count as "covered"
const COVERAGE_THRESHOLD = 0.40;

// Default confidence cutoff (overridable via .env LLM_CONFIDENCE_THRESHOLD)
const DEFAULT_CONFIDENCE_THRESHOLD = 0.45;

// ---------------------------------------------------------------------------
// computeConfidence
// ---------------------------------------------------------------------------
/**
 * Computes a weighted confidence score from Qdrant hybrid search results.
 *
 * Formula:
 *   confidence = 0.5 × top1Score  +  0.3 × avgTop5  +  0.2 × coverageScore
 *
 * Where:
 *   top1Score     — cosine similarity of the best-matching chunk (0–1)
 *   avgTop5       — mean cosine similarity of the top-5 chunks (0–1)
 *   coverageScore — fraction of ALL returned chunks with score ≥ COVERAGE_THRESHOLD
 *
 * @param {Array} searchResults — output of performHybridSearch (each item has .vectorScore)
 * @returns {number} confidence in [0, 1]
 */
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
// selectModel
// ---------------------------------------------------------------------------
/**
 * Returns the LLM client and model name to use for a given confidence score.
 *
 * Uses Qwen (free) when:
 *   - OPENROUTER_API_KEY is set AND
 *   - confidence >= threshold (default 0.45, configurable via env)
 *
 * Falls back to OpenAI gpt-4o-mini otherwise.
 *
 * @param {number} confidence — output of computeConfidence()
 * @returns {{ client: OpenAI, model: string, provider: string }}
 */
const selectModel = (confidence) => {
    const threshold = parseFloat(process.env.LLM_CONFIDENCE_THRESHOLD ?? String(DEFAULT_CONFIDENCE_THRESHOLD));
    const qwenReady = Boolean(process.env.OPENROUTER_API_KEY);

    if (qwenReady && confidence >= threshold) {
        return { client: qwenClient, model: FREE_MODEL, provider: 'openrouter/free' };
    }
    return { client: openaiClient, model: OPENAI_MODEL, provider: 'openai' };
};

// ---------------------------------------------------------------------------
// createThinkFilter
// ---------------------------------------------------------------------------
/**
 * Returns a stateful transform function that strips <think>…</think> blocks
 * from a Qwen streaming response.
 *
 * Call once per request, then pipe every raw streaming token through it.
 * Returns the visible text for that token (may be an empty string while
 * buffering inside a think block).
 *
 * Example:
 *   const filter = createThinkFilter();
 *   for await (const chunk of stream) {
 *       const visible = filter(chunk.choices[0]?.delta?.content || '');
 *       if (visible) emit(visible);
 *   }
 */
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
                // Everything after </think> (strip leading newlines added by Qwen)
                const after = buffer.slice(closeIdx + '</think>'.length).replace(/^\n+/, '');
                buffer = '';
                return after;
            }
            // Still inside the think block — suppress output
            return '';
        }

        // Haven't seen <think> — if enough content has arrived without it, flush
        if (buffer.length >= 20) {
            done = true;
            const out = buffer;
            buffer = '';
            return out;
        }

        return '';
    };
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
    computeConfidence,
    selectModel,
    createThinkFilter,
    openaiClient,
    qwenClient,
    OPENAI_MODEL,
    FREE_MODEL,
};
