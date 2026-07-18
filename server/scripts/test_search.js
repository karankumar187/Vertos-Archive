const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { performHybridSearch } = require('../src/services/search.service');

async function test() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log("Testing search query: 'What is AutoCAD?'");
        const results = await performHybridSearch("What is AutoCAD?", {}, 5);
        
        console.log(`\nFound ${results.length} chunks:`);
        results.forEach((r, i) => {
            console.log(`\n[${i + 1}] Document: ${r.metadata.title} (Score: ${r.rrfScore})`);
            console.log(`Text snippet: ${r.text.substring(0, 100)}...`);
        });

        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    }
}

test();
