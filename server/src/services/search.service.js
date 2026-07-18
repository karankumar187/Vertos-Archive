const { generateEmbeddings } = require('./openai.service');
const { searchQdrant } = require('./qdrant.service');
const Document = require('../models/Document');

const RRF_K = 60;

/**
 * Calculates the Reciprocal Rank Fusion score.
 */
const getRrfScore = (rank) => {
    if (rank === -1) return 0;
    return 1 / (RRF_K + rank);
};

/**
 * Performs a Hybrid Search by combining Semantic Vector Search (Qdrant)
 * and Keyword Search (MongoDB $text index), merged via Reciprocal Rank Fusion.
 *
 * @param {string} query - The user's search query.
 * @param {Object} filters - Optional filters (e.g. { category: 'notes', subject: 'dbms' })
 * @returns {Promise<Array>} - The top ranked text chunks with their metadata.
 */
exports.performHybridSearch = async (query, filters = {}, limit = 40) => {
    try {
        console.log(`[HybridSearch] Starting search for query: "${query}"`);
        
        // 1. Get Query Embedding
        const [queryEmbedding] = await generateEmbeddings([query]);

        // 2. Prepare filters
        // Strip out any undefined or empty values so they don't break Qdrant/Mongo
        const activeFilters = { ...filters };
        Object.keys(activeFilters).forEach(k => {
            if (activeFilters[k] === undefined || activeFilters[k] === null || activeFilters[k] === '') {
                delete activeFilters[k];
            }
        });

        // Map our clean filter object to Qdrant filter syntax
        let qdrantFilter = null;
        if (Object.keys(activeFilters).length > 0) {
            const conditions = Object.entries(activeFilters).map(([key, value]) => ({
                key: key,
                match: { value: value }
            }));
            qdrantFilter = {
                must: conditions
            };
        }

        // 3. Execute Vector Search (Qdrant)
        // Fetch more than we need so we can rank and capture large multi-page documents
        const qdrantFetchLimit = Math.max(limit * 2, 80);
        let vectorResults = await searchQdrant(queryEmbedding, qdrantFetchLimit, qdrantFilter);
        
        // Filter out weak vector matches to ensure search relevance.
        // Bypass threshold for syllabus and notes so we don't drop distant-but-relevant chunks.
        const isSyllabus = activeFilters.category === 'syllabus';
        const isNotes = activeFilters.category === 'notes';
        vectorResults = vectorResults.filter(point => isSyllabus || isNotes || point.score >= 0.25);
        
        // 4. Execute Keyword Search (MongoDB)
        // Use the same clean activeFilters for Mongo
        const mongoFilter = { ...activeFilters };

        // Only do text search if query has words
        let keywordResults = [];
        if (query.trim().length > 0) {
            keywordResults = await Document.find(
                { $text: { $search: query }, ...mongoFilter, indexed: true },
                { score: { $meta: "textScore" } }
            )
            .sort({ score: { $meta: "textScore" } })
            .limit(10)
            .lean();
        }

        console.log(`[HybridSearch] Vector hits: ${vectorResults.length}, Keyword hits: ${keywordResults.length}`);

        // 5. Reciprocal Rank Fusion (RRF)
        // We want to return chunks. A chunk gets its own vector rank + its parent document's keyword rank.
        
        // Map document IDs to their keyword rank (1-indexed)
        const docKeywordRanks = {};
        keywordResults.forEach((doc, index) => {
            docKeywordRanks[doc._id.toString()] = index + 1;
        });

        const fusedResults = vectorResults.map((point, index) => {
            const vectorRank = index + 1;
            const docId = point.payload.documentId;
            const keywordRank = docKeywordRanks[docId] || -1;

            const rrfScore = getRrfScore(vectorRank) + getRrfScore(keywordRank);

            return {
                chunkId: point.id,
                chunkIndex: point.payload.chunkIndex || 0,
                documentId: docId,
                text: point.payload.text,
                metadata: {
                    title: point.payload.title,
                    subject: point.payload.subject,
                    category: point.payload.category,
                    source: point.payload.source,
                    fileUrl: point.payload.fileUrl || '',
                    fileType: point.payload.fileType || '',
                    files: point.payload.files || [],
                },
                rrfScore: rrfScore,
                vectorScore: point.score
            };
        });

        // 6. Sort by RRF score descending
        fusedResults.sort((a, b) => b.rrfScore - a.rrfScore);
        
        // 7. Strictly enforce subject filter — when a specific course is requested,
        // remove any chunks that don't belong to that course.
        // This prevents keyword matches from unrelated subjects leaking in via RRF.
        let strictResults = fusedResults;
        if (filters.subject) {
            const targetSubject = filters.subject.toLowerCase().replace(/\s+/g, '');
            strictResults = fusedResults.filter(r => {
                const chunkSubject = (r.metadata.subject || '').toLowerCase().replace(/\s+/g, '');
                return chunkSubject === targetSubject;
            });
            console.log(`[HybridSearch] Subject filter "${filters.subject}" applied: ${fusedResults.length} → ${strictResults.length} chunks.`);
        }
        
        const finalResults = strictResults.slice(0, limit);

        console.log(`[HybridSearch] Returning ${finalResults.length} fused chunks.`);
        return finalResults;

    } catch (error) {
        console.error('[HybridSearch] Error performing hybrid search:', error);
        throw error;
    }
};
