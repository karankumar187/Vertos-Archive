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
            
            // Create payload indexes for filtering
            console.log(`[Qdrant] Creating payload index for 'category'...`);
            await client.createPayloadIndex(COLLECTION_NAME, {
                field_name: 'category',
                field_schema: 'keyword',
                wait: true,
            });
            console.log(`[Qdrant] Creating payload index for 'subject'...`);
            await client.createPayloadIndex(COLLECTION_NAME, {
                field_name: 'subject',
                field_schema: 'keyword',
                wait: true,
            });
            console.log(`[Qdrant] Payload indexes created.`);
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

/**
 * Searches Qdrant for vectors closest to the provided query embedding.
 * 
 * @param {number[]} queryEmbedding - The 1536-dimensional vector for the user query.
 * @param {number} limit - Number of results to return.
 * @param {Object} filter - Optional Qdrant filter object to restrict search (e.g. by category or subject).
 * @returns {Promise<Array>} - Array of scored point objects with payloads.
 */
exports.searchQdrant = async (queryEmbedding, limit = 5, filter = null) => {
    try {
        const searchParams = {
            collection_name: COLLECTION_NAME,
            vector: queryEmbedding,
            limit: limit,
            with_payload: true,
        };

        if (filter) {
            searchParams.filter = filter;
        }

        const results = await client.search(COLLECTION_NAME, searchParams);
        return results;
    } catch (error) {
        console.error('[Qdrant] Error searching vectors:', error);
        throw error;
    }
};
/**
 * Deletes all chunks associated with a given document from Qdrant.
 * 
 * @param {string} documentId - The MongoDB ObjectId of the document.
 */
exports.deleteDocumentEmbeddings = async (documentId) => {
    try {
        await client.delete(COLLECTION_NAME, {
            wait: true,
            filter: {
                must: [
                    {
                        key: 'documentId',
                        match: { value: documentId.toString() }
                    }
                ]
            }
        });
        console.log(`[Qdrant] Successfully deleted all chunks for document ${documentId}`);
    } catch (error) {
        console.error(`[Qdrant] Error deleting chunks for document ${documentId}:`, error);
        throw error;
    }
};

exports.qdrantClient = client;