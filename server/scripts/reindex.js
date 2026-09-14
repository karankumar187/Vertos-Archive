'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { initQdrant } = require('../src/services/qdrant.service');
const Document = require('../src/models/Document');
const { processDocument } = require('../src/services/pipelineWorker');

async function main() {
    console.log('--- Verto AI Qdrant Re-indexer ---');
    console.log('QDRANT_URL:', process.env.QDRANT_URL);
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully.');

    console.log('Initializing Qdrant collection and payload indexes...');
    await initQdrant();

    const docs = await Document.find({}).sort({ createdAt: 1 });
    console.log(`Found ${docs.length} documents to index into Qdrant.`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        console.log(`\n[${i + 1}/${docs.length}] Processing: "${doc.title}" (${doc.subject || 'No subject'}, ${doc.category || 'No category'})...`);
        try {
            const ok = await processDocument(doc._id);
            if (ok) {
                success++;
                console.log(` -> SUCCESS: Document ${doc._id} indexed.`);
            } else {
                failed++;
                console.warn(` -> FAILED: processDocument returned false for ${doc._id}`);
            }
        } catch (err) {
            failed++;
            console.error(` -> ERROR processing ${doc._id}:`, err.message);
        }
    }

    console.log(`\n========================================`);
    console.log(`Re-indexing Complete!`);
    console.log(`Total: ${docs.length} | Success: ${success} | Failed: ${failed}`);
    console.log(`========================================`);
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error during re-indexing:', err);
    process.exit(1);
});
