'use strict';

const { getProvidersWaterfall } = require('./llm.service');

async function testAllKeys() {
    // We pass confidence 1.0 to get all free providers + OpenAI
    const providers = getProvidersWaterfall(1.0);
    console.log(`\nTesting ${providers.length} providers from waterfall...\n`);

    const messages = [{ role: 'user', content: 'Reply with exactly the word "SUCCESS". No other text.' }];

    for (const { id, client, model, providerName } of providers) {
        console.log(`[${providerName}] Testing model '${model}'...`);
        try {
            const start = Date.now();
            const response = await client.chat.completions.create({
                model,
                messages,
                max_tokens: 10,
                stream: false,
            });
            const text = response.choices[0]?.message?.content || '';
            const elapsed = Date.now() - start;
            console.log(`  ✅ SUCCESS! Took ${elapsed}ms. Response: "${text.trim()}"\n`);
        } catch (err) {
            console.log(`  ❌ FAILED! Error: ${err.message}\n`);
        }
    }
}

testAllKeys();
