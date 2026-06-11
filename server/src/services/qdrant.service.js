const { QdrantClient } = require('@qdrant/js-client-rest');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const crypto = require('crypto');

const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = 'vertos_documents';

/**
 * Initializes Qdrant. Ensures the target collection exists.
 */
exports.initQdrant = async () => {
    try {
        const result = await client.getCollections();
        const exists = result.collections.some(c => c.name === COLLECTION_NAME);

        if (!exists) {
            console.log(`[Qdrant] Collection '${COLLECTION_NAME}' not found. Creating...`);
            await client.createCollection(COLLECTION_NAME, {
                vectors: {
                    size: 1536, // size for OpenAI text-embedding-3-small
                    distance: 'Cosine',
                },
            });
            console.log(`[Qdrant] Collection '${COLLECTION_NAME}' created successfully.`);
        } else {
            console.log(`[Qdrant] Collection '${COLLECTION_NAME}' already exists.`);
        }
    } catch (err) {
        console.error('[Qdrant] Error during initialization:', err);
    }
};

/**
 * Pushes document chunks and their embeddings into Qdrant.
 * 
 * @param {string} documentId - The MongoDB ObjectId of the document.
 * @param {string[]} chunks - Array of text chunks.
 * @param {number[][]} embeddings - Array of floating point vector arrays.
 * @param {Object} metadata - Payload to attach to every chunk (title, subject, category, etc).
 */
exports.pushChunksToQdrant = async (documentId, chunks, embeddings, metadata) => {
    if (chunks.length !== embeddings.length) {
        throw new Error('Mismatched chunks and embeddings length');
    }

    if (chunks.length === 0) return;

    try {
        const points = chunks.map((chunkText, index) => {
            // Generate a deterministic UUID for this chunk based on the doc ID and chunk index
            // This prevents duplicate points if the pipeline is rerun
            const idHash = crypto.createHash('md5').update(`${documentId}_chunk_${index}`).digest('hex');
            const pointId = [
                idHash.slice(0, 8),
                idHash.slice(8, 12),
                idHash.slice(12, 16),
                idHash.slice(16, 20),
                idHash.slice(20, 32)
            ].join('-');

            return {
                id: pointId,
                vector: embeddings[index],
                payload: {
                    documentId: documentId.toString(),
                    chunkIndex: index,
                    text: chunkText,
                    ...metadata
                }
            };
        });

        await client.upsert(COLLECTION_NAME, {
            wait: true, // wait for changes to actually be applied before resolving
            points: points
        });

        console.log(`[Qdrant] Successfully pushed ${points.length} chunks for document ${documentId}`);
    } catch (error) {
        console.error(`[Qdrant] Error pushing chunks for document ${documentId}:`, error);
        throw error;
    }
};

exports.qdrantClient = client;