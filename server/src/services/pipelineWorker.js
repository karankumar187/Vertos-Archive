const Document = require('../models/Document');
const Suggestion = require('../models/Suggestion');
const { extractTextFromUrl } = require('./documentParser');
const { chunkText } = require('./textChunker');
const { generateDocumentInsights } = require('./openrouter.service');

/**
 * Asynchronously processes an approved document:
 * 1. Downloads & Extracts Text
 * 2. Chunks Text
 * 3. Generates LLM insights (Topics & Questions)
 * 4. Saves insights & marks as indexed
 */
exports.processDocument = async (documentId) => {
    try {
        console.log(`[Pipeline] Starting processing for document: ${documentId}`);
        const doc = await Document.findById(documentId);
        
        if (!doc) {
            throw new Error(`Document ${documentId} not found in database.`);
        }

        // 1. Download & Extract Text (pass MIME type so parser doesn't guess from title)
        console.log(`[Pipeline] Downloading and parsing file... (type: ${doc.fileType || 'unknown'})`);
        const rawText = await extractTextFromUrl(doc.fileUrl, doc.fileType);
        
        if (!rawText || rawText.length < 50) {
            console.log(`[Pipeline] Warning: Extracted text is extremely short or empty.`);
        }

        // 2. Chunk Text (1000 size, 200 overlap)
        console.log(`[Pipeline] Chunking text...`);
        const chunks = chunkText(rawText, 1000, 200);
        console.log(`[Pipeline] Generated ${chunks.length} chunks.`);

        // 3. Generate LLM Insights
        console.log(`[Pipeline] Generating LLM insights via OpenRouter...`);
        let insights = { topics: "", questions: "" };
        
        if (chunks.length > 0) {
            try {
                insights = await generateDocumentInsights(chunks);
            } catch (llmError) {
                if (llmError.status === 401 || llmError.status === 403) {
                    console.warn('[Pipeline] ⚠️  OpenRouter auth/credit error. AI suggestions skipped. Add credits at openrouter.ai to enable this feature.');
                } else {
                    console.error(`[Pipeline] LLM Insight generation failed:`, llmError.message);
                }
            }
        }

        // 4. Save Insights to Database
        console.log(`[Pipeline] Saving insights to MongoDB...`);
        const suggestion = new Suggestion({
            documentId: doc._id,
            topics: insights.topics || "No topics generated.",
            questions: insights.questions || "No questions generated."
        });
        await suggestion.save();

        // 5. Update Document Status
        doc.indexed = true;
        await doc.save();

        console.log(`[Pipeline] Successfully processed document: ${documentId}`);
        return true;
    } catch (error) {
        console.error(`[Pipeline] Fatal error processing document ${documentId}:`, error);
        return false;
    }
};
