const { QdrantClient } = require('@qdrant/js-client-rest');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const client = new QdrantClient({
    url: process.env.QDRANT_URI,
    apiKey: process.env.QDRANT_API_KEY,
});

(async () => {
    try {
        const result = await client.getCollections();
        console.log('List of collections:', result.collections);
    } catch (err) {
        console.error('Could not get collections:', err);
    }
})();