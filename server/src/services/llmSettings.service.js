'use strict';

/**
 * In-memory LLM Settings Store
 * Holds runtime configuration for the LLM router that admins can change
 * without restarting the server. Changes persist until the next server restart.
 */

const settings = {
    // 'waterfall' = try providers in priority order (best quality first)
    // 'load-balance' = randomly shuffle free providers to spread traffic
    routingMode: 'waterfall',
    
    // Confidence threshold: queries below this score skip free providers and go straight to OpenAI
    confidenceThreshold: parseFloat(process.env.LLM_CONFIDENCE_THRESHOLD ?? '0.45'),
    
    // Individual provider toggles — admin can disable a broken provider instantly
    providerEnabled: {
        openrouter:   true,
        groq:         true,
        huggingface:  true,
        mistral:      true,
        openai:       true, // OpenAI cannot be disabled (ultimate fallback)
    }
};

const getSettings = () => ({ ...settings, providerEnabled: { ...settings.providerEnabled } });

const updateSettings = (patch) => {
    if (patch.routingMode && ['waterfall', 'load-balance'].includes(patch.routingMode)) {
        settings.routingMode = patch.routingMode;
    }
    if (typeof patch.confidenceThreshold === 'number' && patch.confidenceThreshold >= 0 && patch.confidenceThreshold <= 1) {
        settings.confidenceThreshold = patch.confidenceThreshold;
    }
    if (patch.providerEnabled && typeof patch.providerEnabled === 'object') {
        Object.keys(patch.providerEnabled).forEach(k => {
            if (k in settings.providerEnabled && k !== 'openai') {
                settings.providerEnabled[k] = Boolean(patch.providerEnabled[k]);
            }
        });
    }
    return getSettings();
};

module.exports = { getSettings, updateSettings };
