const Document = require('../models/Document');
const Suggestion = require('../models/Suggestion');
const { extractTextFromUrl } = require('./documentParser');
const { chunkText } = require('./textChunker');
const { generateDocumentInsights } = require('./openai.service');

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

        // 1. Get Extracted Text
        // We use the text pre-extracted during upload to avoid re-downloading from Cloudinary
        let rawText = doc.extractedText || '';
        
        if (!rawText) {
            console.log(`[Pipeline] No pre-extracted text found. Falling back to Cloudinary download...`);
            rawText = await extractTextFromUrl(doc.fileUrl, doc.fileType);
        } else {
            console.log(`[Pipeline] Using pre-extracted text (${rawText.length} characters).`);
        }
        
        if (!rawText || rawText.length < 50) {
            console.log(`[Pipeline] Warning: Extracted text is extremely short or empty.`);
        }

        // 2. Chunk Text (1000 size, 200 overlap)
        console.log(`[Pipeline] Chunking text...`);
        const chunks = chunkText(rawText, 1000, 200);
        console.log(`[Pipeline] Generated ${chunks.length} chunks.`);

        // 3. Generate LLM Insights
        console.log(`[Pipeline] Generating LLM insights via OpenAI (gpt-4o-mini)...`);
        let insights = { topics: "", questions: "" };
        
        if (chunks.length > 0) {
            // Generate insights — non-fatal if it fails
            try {
                insights = await generateDocumentInsights(chunks);
            } catch (insightErr) {
                console.warn(`[Pipeline] LLM insight generation failed (non-fatal):`, insightErr.message);
            }

            // 4. Generate Embeddings & Push to Vector DB — non-fatal if it fails
            try {
                console.log(`[Pipeline] Generating embeddings for ${chunks.length} chunks...`);
                const { generateEmbeddings } = require('./openai.service');
                const embeddings = await generateEmbeddings(chunks);
                
                console.log(`[Pipeline] Pushing chunks to Qdrant Vector DB...`);
                const { pushChunksToQdrant } = require('./qdrant.service');
                
                const metadata = {
                    title: doc.title,
                    subject: doc.subject || '',
                    category: doc.category || '',
                    source: doc.source || 'User Upload',
                    uploaderID: doc.uploaderID ? doc.uploaderID.toString() : '',
                    fileUrl: doc.fileUrl || '',
                    fileType: doc.fileType || '',
                    files: doc.files || [],
                };
                
                await pushChunksToQdrant(documentId, chunks, embeddings, metadata);
            } catch (qdrantErr) {
                console.warn(`[Pipeline] Qdrant push failed (non-fatal):`, qdrantErr.message);
            }
        }

        // 5. Save generated Insights to MongoDB
        console.log(`[Pipeline] Saving insights to MongoDB...`);
        const suggestion = new Suggestion({
            documentId: doc._id,
            topics: insights.topics || "General Topics",
            questions: insights.questions || "No questions generated."
        });
        await suggestion.save();

        // 6. Mark Document as Indexed
        doc.indexed = true;
        await doc.save();

        console.log(`[Pipeline] Successfully processed document: ${documentId}`);
        return true;
    } catch (error) {
        console.error(`[Pipeline] Fatal error processing document ${documentId}:`, error);
        return false;
    }
};
