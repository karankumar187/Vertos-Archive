const Document = require('../models/Document');
const Suggestion = require('../models/Suggestion');
const { extractTextFromUrl, extractTextWithOcrFallback } = require('./documentParser');
const { chunkText } = require('./textChunker');
const { generateDocumentInsights } = require('./openai.service');

// Minimum characters-per-page threshold.
// If the raw text / pageCount ratio is below this, we treat the doc as
// scanned/handwritten and trigger Vision OCR.
const MIN_CHARS_PER_PAGE = 80;

/**
 * Asynchronously processes an approved document:
 * 1. Gets pre-extracted text (or re-downloads from Cloudinary)
 * 2. Checks if the text density is too low (scanned/handwritten) → Vision OCR fallback
 * 3. Chunks Text
 * 4. If chunks === 0 after normal parse → OCR fallback
 * 5. Generates LLM insights (Topics & Questions)
 * 6. Pushes chunks + embeddings to Qdrant
 * 7. Saves insights & marks document as indexed
 */
exports.processDocument = async (documentId) => {
    try {
        console.log(`[Pipeline] Starting processing for document: ${documentId}`);
        const doc = await Document.findById(documentId);
        
        if (!doc) {
            throw new Error(`Document ${documentId} not found in database.`);
        }

        // ── Step 1: Get Raw Text ─────────────────────────────────────────────
        let rawText = doc.extractedText || '';
        
        if (!rawText) {
            console.log(`[Pipeline] No pre-extracted text found. Falling back to Cloudinary download...`);
            try {
                rawText = await extractTextFromUrl(doc.fileUrl, doc.fileType);
            } catch (parseErr) {
                console.warn(`[Pipeline] Primary extraction failed: ${parseErr.message}`);
                rawText = '';
            }
        } else {
            console.log(`[Pipeline] Using pre-extracted text (${rawText.length} characters).`);
        }

        // ── Step 2: Detect sparse/scanned content before chunking ────────────
        // If the document has a known page count, check chars-per-page ratio
        const pageCount = doc.pageCount || 0;
        const isLikelyScanned = pageCount > 0 && rawText.length / pageCount < MIN_CHARS_PER_PAGE;

        if (isLikelyScanned) {
            console.log(
                `[Pipeline] ⚠️  Sparse text detected (${rawText.length} chars / ${pageCount} pages = ` +
                `${Math.round(rawText.length / pageCount)} chars/page < ${MIN_CHARS_PER_PAGE} threshold). ` +
                `Likely scanned or handwritten — triggering Vision OCR fallback immediately.`
            );
            try {
                const ocrText = await extractTextWithOcrFallback(doc.fileUrl, doc.fileType, pageCount);
                if (ocrText && ocrText.length > rawText.length) {
                    console.log(`[Pipeline] Vision OCR improved text: ${rawText.length} → ${ocrText.length} chars.`);
                    rawText = ocrText;
                }
            } catch (ocrErr) {
                console.warn(`[Pipeline] Vision OCR pre-check failed (non-fatal): ${ocrErr.message}`);
            }
        }

        // ── Step 3: Chunk Text ───────────────────────────────────────────────
        console.log(`[Pipeline] Chunking text (${rawText.length} chars)...`);
        let chunks = chunkText(rawText, 1000, 200);
        console.log(`[Pipeline] Generated ${chunks.length} chunks.`);

        // ── Step 4: OCR Fallback if chunks === 0 ────────────────────────────
        // This catches scanned PDFs that weren't caught by the density check
        // (e.g. unknown page count, or images-only PDFs with 0 pages reported)
        if (chunks.length === 0) {
            console.log(
                `[Pipeline] ⚠️  Zero chunks produced from primary extraction. ` +
                `Triggering Vision OCR fallback for scanned/handwritten document...`
            );
            try {
                const ocrText = await extractTextWithOcrFallback(doc.fileUrl, doc.fileType, pageCount);
                if (ocrText && ocrText.trim().length > 0) {
                    console.log(`[Pipeline] Vision OCR produced ${ocrText.length} chars. Re-chunking...`);
                    rawText = ocrText;
                    chunks = chunkText(rawText, 1000, 200);
                    console.log(`[Pipeline] Re-chunked into ${chunks.length} chunks after Vision OCR.`);

                    // Persist the OCR text back to the Document so future re-processes skip re-OCR
                    doc.extractedText = rawText;
                    await doc.save();
                } else {
                    console.warn(`[Pipeline] Vision OCR fallback also produced no text. Document will be indexed without vectors.`);
                }
            } catch (ocrErr) {
                console.error(`[Pipeline] Vision OCR fallback error:`, ocrErr.message);
            }
        }

        // ── Steps 5–6: Insights + Embeddings (only if chunks exist) ─────────
        let insights = { topics: '', questions: '' };

        if (chunks.length > 0) {
            // Generate LLM insights — non-fatal
            try {
                console.log(`[Pipeline] Generating LLM insights via OpenAI (gpt-4o-mini)...`);
                insights = await generateDocumentInsights(chunks);
            } catch (insightErr) {
                console.warn(`[Pipeline] LLM insight generation failed (non-fatal):`, insightErr.message);
            }

            // Generate Embeddings & Push to Qdrant — non-fatal
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
        } else {
            console.warn(`[Pipeline] No chunks available — skipping embeddings and insights.`);
        }

        // ── Step 7: Save Insights & Mark Indexed ────────────────────────────
        console.log(`[Pipeline] Saving insights to MongoDB...`);
        const suggestion = new Suggestion({
            documentId: doc._id,
            topics: insights.topics || 'General Topics',
            questions: insights.questions || 'No questions generated.',
        });
        await suggestion.save();

        doc.indexed = true;
        await doc.save();

        console.log(`[Pipeline] ✅ Successfully processed document: ${documentId} (${chunks.length} chunks indexed)`);
        return true;
    } catch (error) {
        console.error(`[Pipeline] Fatal error processing document ${documentId}:`, error);
        return false;
    }
};
