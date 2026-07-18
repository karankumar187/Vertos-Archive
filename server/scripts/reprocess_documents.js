const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const Document = require('../src/models/Document');
const { qdrantClient, initQdrant } = require('../src/services/qdrant.service');
const { processDocument } = require('../src/services/pipelineWorker');

const COLLECTION_NAME = 'vertos_documents';

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        console.log("Deleting old Qdrant collection...");
        try {
            await qdrantClient.deleteCollection(COLLECTION_NAME);
            console.log("Old collection deleted.");
        } catch (e) {
            console.log("Collection might not exist, skipping delete.", e.message);
        }

        console.log("Re-initializing Qdrant with new settings...");
        await initQdrant();

        console.log("Fetching all indexed documents...");
        const docs = await Document.find({ indexed: true });
        console.log(`Found ${docs.length} documents to reprocess.`);

        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            console.log(`\n[${i + 1}/${docs.length}] Reprocessing: ${doc.title}`);
            // Reset indexed flag
            doc.indexed = false;
            await doc.save();
            
            // Re-process
            await processDocument(doc._id);
        }

        console.log("\nAll documents reprocessed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error during reprocessing:", err);
        process.exit(1);
    }
}

run();
