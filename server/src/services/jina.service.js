const axios = require('axios');

const JINA_RERANK_URL = 'https://api.jina.ai/v1/rerank';
const JINA_MODEL      = 'jina-reranker-v2-base-multilingual';

// Minimum relevance score from Jina for a chunk to be considered useful.
// Jina scores range from 0 to 1. Below 0.5 usually means a weak match.
const RERANKER_CONFIDENCE_THRESHOLD = 0.5;

/**
 * Reranks a list of text chunks against the user's query using Jina AI.
 *
 * @param {string} query        - The user's original question.
 * @param {Array}  chunks       - Array of search result objects (must have a .text field).
 * @param {number} topN         - How many top results to return after reranking.
 * @returns {Promise<{ results: Array, passedThreshold: boolean }>}
 *   - `results`: The top N chunks sorted by Jina relevance score, with `jinaScore` attached.
 *   - `passedThreshold`: true if the best chunk's score is above the confidence threshold.
 */
exports.rerank = async (query, chunks, topN = 5) => {
    if (!process.env.JINA_API_KEY) {
        throw new Error('JINA_API_KEY is not defined in environment variables.');
    }

    if (!chunks || chunks.length === 0) {
        return { results: [], passedThreshold: false };
    }

    // Jina expects an array of plain document strings
    const documents = chunks.map(c => c.text);

    const response = await axios.post(
        JINA_RERANK_URL,
        {
            model: JINA_MODEL,
            query,
            documents,
            top_n: topN,
        },
        {
            headers: {
                'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
                'Content-Type': 'application/json',
            },
        }
    );

    // Jina returns results sorted by relevance_score descending.
    // Each result has an `index` (pointing to the original documents array) and a `relevance_score`.
    const jinaResults = response.data.results || [];

    const rerankedChunks = jinaResults.map(r => ({
        ...chunks[r.index],   // Restore the original chunk object (with metadata)
        jinaScore: r.relevance_score,
    }));

    const topScore = rerankedChunks.length > 0 ? rerankedChunks[0].jinaScore : 0;
    const passedThreshold = topScore >= RERANKER_CONFIDENCE_THRESHOLD;

    console.log(`[Jina] Reranked ${chunks.length} chunks → Top ${rerankedChunks.length}. Best score: ${topScore.toFixed(3)} (threshold: ${RERANKER_CONFIDENCE_THRESHOLD})`);

    return { results: rerankedChunks, passedThreshold };
};

const JINA_EMBEDDING_URL = 'https://api.jina.ai/v1/embeddings';
const JINA_EMBEDDING_MODEL = 'jina-embeddings-v3';

/**
 * Generates embeddings using Jina AI's embedding API.
 * jina-embeddings-v3 natively generates 1024-dimensional vectors, 
 * perfectly matching our Qdrant schema that was originally built for BGE-M3.
 *
 * @param {string[]} texts - Array of text strings to embed.
 * @returns {Promise<number[][]>} - Array of embedding vectors.
 */
exports.generateEmbeddings = async (texts) => {
    if (!process.env.JINA_API_KEY) {
        throw new Error('JINA_API_KEY is not defined in environment variables.');
    }

    try {
        const response = await axios.post(
            JINA_EMBEDDING_URL,
            {
                model: JINA_EMBEDDING_MODEL,
                input: texts,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const data = response.data.data;
        if (!data || data.length === 0) {
            throw new Error('Jina returned an empty embedding array.');
        }

        const embeddings = data.map(item => item.embedding);
        return embeddings;
    } catch (error) {
        console.error('[Jina] Error generating embeddings:', error.response?.data || error.message);
        throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
};
