const { QdrantClient } = require('@qdrant/js-client-rest');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'server/.env') });

const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
});

async function run() {
    const res = await client.scroll('vertos_documents', { limit: 1 });
    console.log(JSON.stringify(res.points[0].payload, null, 2));
}
run().catch(console.error);
