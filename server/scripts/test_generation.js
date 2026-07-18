require('dotenv').config();
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { classifyQuery, streamChatCompletion } = require('../src/services/openrouter.service');
const { openaiClient } = require('../src/services/openai.service');
const jinaService = require('../src/services/jina.service');
const searchService = require('../src/services/search.service');

async function testGeneration() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const query = "What are the tools used in OOAD? Answer in exactly two sentences.";
    console.log(`\n--- Test 1: Query Classifier ---`);
    const intent = await classifyQuery(query);
    console.log(`Classified intent: ${intent}`);

    console.log(`\n--- Test 2: Hybrid Search & Jina Embeddings ---`);
    const chunks = await searchService.performHybridSearch(query, {}, 5);
    console.log(`Found ${chunks.length} chunks.`);

    console.log(`\n--- Test 3: Jina Reranker ---`);
    const { results: reranked, passedThreshold } = await jinaService.rerank(query, chunks, 3);
    console.log(`Reranked to ${reranked.length} chunks. Passed threshold: ${passedThreshold}`);

    const contextText = reranked.map(c => c.text).join('\n\n');
    const apiMessages = [
        { role: 'system', content: `Answer using context:\n${contextText}` },
        { role: 'user', content: query }
    ];

    console.log(`\n--- Test 4: Primary Generator (Qwen 3 via OpenRouter) ---`);
    let qwenOutput = "";
    await new Promise((resolve) => {
        streamChatCompletion(apiMessages, (chunk) => {
            qwenOutput += chunk;
            process.stdout.write(chunk);
        }).then(resolve);
    });
    console.log(`\n\n[Qwen 3 Check]: Complete.`);

    console.log(`\n--- Test 5: Fallback Generator (GPT-4o-mini via OpenAI) ---`);
    const gptCompletion = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: apiMessages,
        max_tokens: 200,
    });
    console.log(gptCompletion.choices[0].message.content);
    
    mongoose.connection.close();
}

testGeneration().catch(console.error);
