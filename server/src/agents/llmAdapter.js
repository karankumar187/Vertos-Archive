'use strict';

const { getProvidersWaterfall, createThinkFilter, markProviderFailure } = require('../services/llm.service');

/**
 * Robust LLM call that returns a parsed JSON object.
 * Tries providers in waterfall sequence until one succeeds.
 */
async function callLLMJson({ messages, temperature = 0.2, confidence = 0.8 }) {
    const providers = getProvidersWaterfall(confidence);
    let lastError = null;

    for (const provider of providers) {
        try {
            console.log(`[LLM Adapter] Requesting structured JSON from ${provider.providerName} (${provider.model})...`);
            
            const completion = await provider.client.chat.completions.create({
                model: provider.model,
                messages,
                temperature,
                response_format: { type: 'json_object' },
            });

            const rawContent = completion.choices[0]?.message?.content || '{}';
            
            // Clean markdown fences if model returned ```json ... ```
            const cleaned = rawContent
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/, '')
                .trim();

            const parsed = JSON.parse(cleaned);
            return parsed;
        } catch (err) {
            console.warn(`[LLM Adapter] ${provider.providerName} JSON call failed: ${err.message}`);
            markProviderFailure(provider.id);
            lastError = err;
        }
    }

    throw new Error(`All LLM providers failed for JSON request: ${lastError?.message}`);
}

/**
 * Robust streaming LLM call that invokes onToken(tokenText) for each chunk.
 * Tries providers in waterfall sequence until one successfully initiates and streams.
 */
async function streamLLM({ messages, temperature = 0.5, confidence = 0.8, onToken, onProvider }) {
    const providers = getProvidersWaterfall(confidence);
    let lastError = null;

    for (const provider of providers) {
        try {
            console.log(`[LLM Adapter] Streaming response from ${provider.providerName} (${provider.model})...`);
            if (onProvider) {
                onProvider({ providerName: provider.providerName, model: provider.model });
            }
            
            const stream = await provider.client.chat.completions.create({
                model: provider.model,
                messages,
                temperature,
                stream: true,
            });

            const thinkFilter = createThinkFilter();
            let fullText = '';

            for await (const chunk of stream) {
                const token = chunk.choices[0]?.delta?.content || '';
                if (!token) continue;

                const filteredToken = thinkFilter(token);
                if (filteredToken) {
                    fullText += filteredToken;
                    if (onToken) {
                        onToken(filteredToken);
                    }
                }
            }

            // Flush any remaining buffered tokens
            const endToken = thinkFilter('', true);
            if (endToken) {
                fullText += endToken;
                if (onToken) onToken(endToken);
            }

            return fullText;
        } catch (err) {
            console.warn(`[LLM Adapter] Streaming failed on ${provider.providerName}: ${err.message}`);
            markProviderFailure(provider.id);
            lastError = err;
        }
    }

    throw new Error(`All LLM providers failed for streaming: ${lastError?.message}`);
}

module.exports = {
    callLLMJson,
    streamLLM,
};
