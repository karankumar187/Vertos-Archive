const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { performHybridSearch } = require('../services/search.service');
const { openaiClient } = require('../services/openai.service');
const { chatCompletion, streamChatCompletion } = require('../services/openrouter.service');
const { rerank } = require('../services/jina.service');
const Document = require('../models/Document');

// --- Pipeline Confidence Thresholds ---
// Minimum vector similarity score from Qdrant for the search to be considered relevant.
const RETRIEVAL_CONFIDENCE_THRESHOLD = 0.30;


// Get all conversations for a user
exports.getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({ userId: req.user._id })
            .sort({ isStarred: -1, updatedAt: -1 })
            .lean();
        res.json({ success: true, conversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Create a new conversation
exports.createConversation = async (req, res) => {
    try {
        const conversation = new Conversation({
            userId: req.user._id,
            title: 'New Conversation'
        });
        await conversation.save();
        res.status(201).json({ success: true, conversation });
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get messages for a specific conversation
exports.getMessages = async (req, res) => {
    try {
        const messages = await Message.find({ conversationId: req.params.id })
            .sort({ createdAt: 1 })
            .lean();
        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Send a message and stream the response
exports.sendMessage = async (req, res) => {
    let { content, filters } = req.body;
    const conversationId = req.params.id;

    if (!content) {
        return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    // --- AI Prompt Injection Mitigation ---
    content = content.substring(0, 500).replace(/[\r\n]+/g, ' ').replace(/[<>]/g, '');

    // Auto-extract course codes from user query
    let currentFilters = filters || {};
    
    const isSyllabusRequest = /\b(syllabus|course\s*overview|course\s*outline|course\s*content|what\s*is\s*covered|topics\s*covered|course\s*structure)\b/i.test(content);
    const isNotesRequestEarly = /\b(notes|study\s*material|lecture\s*notes|explain|explanation)\b/i.test(content);
    const isGenericPyqRequestEarly = /\b(pyq|pyqs|previous year|past year|practice questions?|mid term|ete|etp|end term)\b/i.test(content);

    const isCaRequestEarly      = /\b(ca\b|class[\s-]?assessment|class[\s-]?test|unit[\s-]?test|ca[\s-]?\d|ca\d)\b/i.test(content);
    const isExamRequestEarly    = /\b(mid[\s-]?term|midterm|mock[\s-]?test|end[\s-]?term|ete|end[\s-]?sem|endsem|etp|end[\s-]?term[\s-]?practical)\b/i.test(content);

    if (isSyllabusRequest) {
        currentFilters.category = 'syllabus';
    } else if (isNotesRequestEarly) {
        currentFilters.category = 'notes';
    } else if (isCaRequestEarly || isExamRequestEarly) {
        // For question generation, search across ALL categories (notes + syllabus + pyq)
        // so the LLM can draw from the richest possible context
        delete currentFilters.category;
    } else if (isGenericPyqRequestEarly) {
        currentFilters.category = 'pyq';
    }

    const fullCourseMatch = content.match(/\b([a-zA-Z]{2,4})[-_\s]*(\d{3})\b/i);
    const numCourseMatch = content.match(/\b(\d{3})\b/);
    
    if (fullCourseMatch || numCourseMatch) {
        try {
            const courseCode = fullCourseMatch ? fullCourseMatch[1] : '';
            const courseNum = fullCourseMatch ? fullCourseMatch[2] : numCourseMatch[1];
            const regexStr = courseCode ? `^${courseCode}[-_\\s]*${courseNum}$` : `^[A-Za-z]{2,4}[-_\\s]*${courseNum}$`;
            const regexMatch = new RegExp(regexStr, 'i');
            
            const uniqueSubjects = await Document.distinct('subject', { subject: regexMatch });
            if (uniqueSubjects.length > 0) {
                currentFilters.subject = uniqueSubjects[0];
            } else if (fullCourseMatch) {
                currentFilters.subject = `${fullCourseMatch[1].toUpperCase()} ${fullCourseMatch[2]}`;
            } else if (numCourseMatch) {
                currentFilters.subject = `UNKNOWN ${numCourseMatch[1]}`;
            }
        } catch (err) {
            console.error('Error resolving course number alias:', err);
        }
    }

    if (!currentFilters.subject) {
        try {
            const syllabi = await Document.find({ category: 'syllabus' }).select('title subject -_id').lean();
            const courseAliases = {
                'mvc': 'INT 221',
                'mvc programming': 'INT 221',
                'developing': 'CSE 225',
                'dbms': 'CSE 332',
                'database': 'CSE 332'
            };
            for (const doc of syllabi) {
                if (doc.title && doc.subject) {
                    const cleanAlias = doc.title.toLowerCase()
                                        .replace(/\b(syllabus|for|course)\b/g, '')
                                        .trim()
                                        .replace(/\s+/g, ' ');
                    if (cleanAlias.length > 3) courseAliases[cleanAlias] = doc.subject;
                }
            }
            const lowerContent = content.toLowerCase();
            for (const [alias, subjectCode] of Object.entries(courseAliases)) {
                const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (new RegExp(`\\b${escapedAlias}\\b`, 'i').test(lowerContent)) {
                    currentFilters.subject = subjectCode;
                    break;
                }
            }
        } catch (err) {
            console.error('Error with dynamic course aliases:', err);
        }
    }

    try {
        // ── Verify conversation ───────────────────────────────────────────────
        const conversation = await Conversation.findOne({ _id: conversationId, userId: req.user._id });
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // ── Save user message ─────────────────────────────────────────────────
        const userMessage = new Message({ conversationId, role: 'user', content });
        await userMessage.save();

        const messageCount = await Message.countDocuments({ conversationId });
        if (messageCount === 1) {
            conversation.title = content.substring(0, 40) + (content.length > 40 ? '...' : '');
            await conversation.save();
        }

        // ── Fetch conversation history ────────────────────────────────────────
        const history = await Message.find({ conversationId })
            .sort({ createdAt: -1 })
            .limit(11)
            .lean();
        history.reverse();

        // ── Manage Active Course Context (Sticky Context) ─────────────────────
        let activeCourseUpdated = false;
        if (currentFilters.subject && currentFilters.subject !== conversation.activeCourse) {
            conversation.activeCourse = currentFilters.subject;
            activeCourseUpdated = true;
        } else if (!currentFilters.subject && conversation.activeCourse) {
            currentFilters.subject = conversation.activeCourse;
        } else if (!currentFilters.subject && !conversation.activeCourse) {
            for (let i = history.length - 1; i >= 0; i--) {
                const histFullMatch = history[i].content.match(/\b([a-zA-Z]{2,4})[-_\s]*(\d{3})\b/i);
                const histNumMatch = history[i].content.match(/\b(\d{3})\b/);
                if (histFullMatch || histNumMatch) {
                    try {
                        const courseCode = histFullMatch ? histFullMatch[1] : '';
                        const courseNum = histFullMatch ? histFullMatch[2] : histNumMatch[1];
                        const regexStr = courseCode ? `^${courseCode}[-_\\s]*${courseNum}$` : `^[A-Za-z]{2,4}[-_\\s]*${courseNum}$`;
                        const uniqueSubjects = await Document.distinct('subject', { subject: new RegExp(regexStr, 'i') });
                        if (uniqueSubjects.length > 0) {
                            currentFilters.subject = uniqueSubjects[0];
                            conversation.activeCourse = currentFilters.subject;
                            activeCourseUpdated = true;
                            break;
                        } else if (histFullMatch) {
                            currentFilters.subject = `${histFullMatch[1].toUpperCase()} ${histFullMatch[2]}`;
                            conversation.activeCourse = currentFilters.subject;
                            activeCourseUpdated = true;
                            break;
                        }
                    } catch (err) {}
                }
            }
        }
        if (activeCourseUpdated) await conversation.save();

        // ── Setup SSE headers early ───────────────────────────────────────────
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Helper to stream a plain text message to the client and close the SSE stream
        const streamCannedResponse = async (text) => {
            res.write(`event: sources\ndata: ${JSON.stringify([])}\n\n`);
            const words = text.split(' ');
            for (const word of words) {
                res.write(`data: ${JSON.stringify({ token: word + ' ' })}\n\n`);
                await new Promise(r => setTimeout(r, 15));
            }
            res.write(`data: [DONE]\n\n`);
            res.end();
        };

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 1: QUERY CLASSIFIER
        // ═══════════════════════════════════════════════════════════════════════
        console.log(`[ChatController] Step 1: Classifying query...`);
        let queryClass = 'rag'; // default to rag
        try {
            const classifierResponse = await chatCompletion([
                {
                    role: 'system',
                    content: `You are a query classifier for a university academic assistant. Classify the user's message into exactly ONE of these categories:\n- "rag": The user is asking an academic question that requires searching university documents (notes, syllabus, PYQs, exams, coding questions, etc.)\n- "greeting": The user is greeting, saying hello/hi/bye, or asking about the assistant itself.\n- "off_topic": The user is asking something completely unrelated to university academics (e.g., cryptocurrency, sports, news, recipes, etc.)\n\nRespond with ONLY the category label and nothing else. No explanation.`
                },
                { role: 'user', content }
            ], 10);
            const cleaned = classifierResponse.trim().toLowerCase().replace(/[^a-z_]/g, '');
            if (['rag', 'greeting', 'off_topic'].includes(cleaned)) {
                queryClass = cleaned;
            }
        } catch (classErr) {
            console.warn(`[ChatController] Query classifier failed (non-fatal), defaulting to rag:`, classErr.message);
        }
        console.log(`[ChatController] Query classified as: "${queryClass}"`);

        if (queryClass === 'greeting') {
            // Save a canned assistant message and stream it
            const greetMsg = `Hello! 👋 I'm **Verto AI**, your academic assistant for LPU. I can help you with syllabus overviews, study notes, past year questions, practice exams, and more. What can I help you with today?`;
            const assistantMessage = new Message({ conversationId, role: 'assistant', content: greetMsg, sources: [] });
            await assistantMessage.save();
            return streamCannedResponse(greetMsg);
        }

        if (queryClass === 'off_topic') {
            const offTopicMsg = `I'm specifically designed to help LPU students with their academic coursework. I don't have information on that topic. Try asking me about a course syllabus, study notes, or past year questions! 📚`;
            const assistantMessage = new Message({ conversationId, role: 'assistant', content: offTopicMsg, sources: [] });
            await assistantMessage.save();
            return streamCannedResponse(offTopicMsg);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 2: HYBRID SEARCH
        // ═══════════════════════════════════════════════════════════════════════
        let searchQuery = content;
        if (conversation.activeCourse && !content.toLowerCase().includes(conversation.activeCourse.toLowerCase())) {
            searchQuery = `${conversation.activeCourse} ${content}`;
        }
        console.log(`[ChatController] Step 2: Performing hybrid search for "${searchQuery}"...`);

        const isQuestionGenRequest = !currentFilters.category; // CA/midterm/ETE = no category set
        let searchResults = [];

        if (isQuestionGenRequest) {
            // ── Two-phase search for question generation ─────────────────────
            // Phase 1: Always search PYQs first (highest priority)
            const pyqResults = await performHybridSearch(searchQuery, { ...currentFilters, category: 'pyq' }, 40);
            console.log(`[ChatController] Phase 1 (PYQ): ${pyqResults.length} chunks found.`);

            if (pyqResults.length >= 10) {
                // Enough PYQs — use them exclusively
                searchResults = pyqResults;
                console.log(`[ChatController] Sufficient PYQs found. Using PYQs only.`);
            } else {
                // Not enough PYQs — supplement with notes + syllabus
                console.log(`[ChatController] Insufficient PYQs (${pyqResults.length}). Supplementing with notes + syllabus...`);
                const supplementResults = await performHybridSearch(searchQuery, { ...currentFilters, category: undefined }, 40);
                // Merge: PYQs first, then supplemental (deduplicated by chunkId)
                const seen = new Set(pyqResults.map(r => r.chunkId));
                const supplementFiltered = supplementResults.filter(r => !seen.has(r.chunkId));
                searchResults = [...pyqResults, ...supplementFiltered].slice(0, 60);
                console.log(`[ChatController] Merged: ${pyqResults.length} PYQs + ${supplementFiltered.length} supplemental = ${searchResults.length} total.`);
            }
        } else {
            // Standard single-phase search for notes, syllabus, etc.
            const searchLimit = currentFilters.category === 'notes' ? 60 : 30;
            searchResults = await performHybridSearch(searchQuery, currentFilters, searchLimit);

            if ((!searchResults || searchResults.length === 0) && (currentFilters.category === 'notes' || currentFilters.category === 'pyq')) {
                console.log(`[ChatController] No ${currentFilters.category} found. Falling back to syllabus.`);
                currentFilters.category = 'syllabus';
                searchResults = await performHybridSearch(searchQuery, currentFilters, searchLimit);
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 3: RETRIEVAL CONFIDENCE CHECK
        // ═══════════════════════════════════════════════════════════════════════
        const topVectorScore = searchResults.length > 0 ? Math.max(...searchResults.map(r => r.vectorScore || 0)) : 0;
        console.log(`[ChatController] Step 3: Top vector score: ${topVectorScore.toFixed(3)} (threshold: ${RETRIEVAL_CONFIDENCE_THRESHOLD})`);

        if (searchResults.length === 0 || topVectorScore < RETRIEVAL_CONFIDENCE_THRESHOLD) {
            const notFoundMsg = `I searched through all the documents in Vertos Archive, but I couldn't find anything relevant to your question. This topic may not have been uploaded yet. Try asking your classmates to upload related notes or PYQs! 🔍`;
            const assistantMessage = new Message({ conversationId, role: 'assistant', content: notFoundMsg, sources: [] });
            await assistantMessage.save();
            return streamCannedResponse(notFoundMsg);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 4: JINA RERANKER
        // ═══════════════════════════════════════════════════════════════════════
        const rerankLimit = (currentFilters.category === 'notes' || currentFilters.category === 'pyq' || isQuestionGenRequest) ? 15 : 7;
        console.log(`[ChatController] Step 4: Reranking ${searchResults.length} chunks with Jina AI (Limit: ${rerankLimit})...`);
        let finalChunks = searchResults; // fallback if Jina fails
        let rerankerPassed = true;

        try {
            const { results: reranked, passedThreshold } = await rerank(searchQuery, searchResults, rerankLimit);
            finalChunks = reranked;
            rerankerPassed = passedThreshold;
        } catch (jinaErr) {
            console.warn(`[ChatController] Jina reranker failed (non-fatal), using raw search results:`, jinaErr.message);
            // Graceful fallback: use top results from hybrid search directly
            finalChunks = searchResults.slice(0, rerankLimit);
        }

        if (!rerankerPassed) {
            const weakMatchMsg = `I found some documents that contain similar words to your query, but none of them seem to directly answer your question. Could you try rephrasing or adding more context? For example, specify the course code (e.g., "CSE 332") or the exact topic name.`;
            const assistantMessage = new Message({ conversationId, role: 'assistant', content: weakMatchMsg, sources: [] });
            await assistantMessage.save();
            return streamCannedResponse(weakMatchMsg);
        }

        // ── Build context from the top 5 reranked chunks ─────────────────────
        finalChunks.sort((a, b) => {
            if (a.documentId !== b.documentId) return a.documentId.localeCompare(b.documentId);
            return a.chunkIndex - b.chunkIndex;
        });

        const contextText = finalChunks.map((r, i) => `[Source ${i + 1} - ${r.metadata.title}]:\n${r.text}`).join('\n\n');
        const sourceData = finalChunks.map(res => ({
            chunkId: res.chunkId,
            documentId: res.documentId,
            title: res.metadata.title,
            text: res.text,
            fileUrl: res.metadata.fileUrl || '',
            fileType: res.metadata.fileType || '',
            category: res.metadata.category || '',
            subject: res.metadata.subject || '',
            files: res.metadata.files || [],
        }));

        // Send sources immediately so the UI can show citations
        res.write(`event: sources\ndata: ${JSON.stringify(sourceData)}\n\n`);

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 5: BUILD MESSAGES ARRAY & APPLY POLICY REMINDERS
        // ═══════════════════════════════════════════════════════════════════════
        const systemPrompt = `You are Verto AI, an expert teaching assistant for university students. 
Answer the user's questions based primarily on the provided context from university documents.
If the answer is not in the context, say "I don't have enough information in the provided documents to answer that definitively." but you can offer general knowledge if appropriate, making sure to clarify it's not from the course material.
Use markdown formatting to make your answers structured and easy to read:
- Be highly detailed, comprehensive, and expressive in your explanations. Write in a friendly, conversational, and encouraging tone (like a supportive senior or peer), rather than a stiff, overly professional one. Use emojis naturally!
- Never output heavily summarized or compressed answers unless the user explicitly asks for a summary. Expand on the context provided to give a rich, thorough explanation.
- ALWAYS break down complex information into bullet points or numbered lists so it's easy for students to digest.
- Avoid long, dense paragraphs. Use bold text to highlight key terms.
- For step-by-step guides, use numbered lists.

=== Context from University Documents ===
${contextText ? contextText : 'No relevant context found in the database.'}

=== FINAL CRITICAL INSTRUCTIONS ===
1. RESPONSE MODE: By default, act like a normal conversational chatbot. If the user only types a course name or code (e.g., "INT 108" or "python"), give a brief 1-2 sentence description of the course and ask them what they need help with (e.g., "Would you like to see the syllabus, study notes, or practice questions?"). Do NOT dump the entire syllabus, notes, or generate questions unless they explicitly ask for them. Only trigger exam/notes/syllabus policies when their specific keywords are present.
2. SYLLABUS & EXPLANATION POLICY: When the user asks for a syllabus, course overview, or explanation of specific units/topics, follow these rules:
   - For a full syllabus request: Start with the course name and code. List EVERY single unit from the context (typically ALL 6 UNITS) with its unit number as a heading (e.g., "**Unit 1: [Title]**") followed by all key topics. Do NOT skip any units. Do NOT stop early.
   - For explaining a specific unit (e.g., "explain unit 5"): You MUST cross-reference the syllabus context for that unit and thoroughly explain EVERY SINGLE topic and sub-topic listed. DO NOT skip, summarize, or leave out any topics. Provide a detailed, structured explanation for each one.
   - Include credit hours, textbooks, and any other relevant info if available.
   - Do NOT generate questions during syllabus or explanation requests unless explicitly asked.
3. QUESTION GENERATION GUIDELINES: When generating any questions (practice, exams, mock tests):
   - Number every question using a Markdown Heading 3: "### Question 1:", "### Question 2:", etc.
   - **MCQ Formatting (CRITICAL)**: You MUST format the question and options so they render correctly on separate lines. ALWAYS insert a blank line (double newline) between the question text and Option A. NEVER output Option A on the same line as the question text. Every option (A, B, C, D) MUST start on its own separate line.
   - **Syllabus Scope (STRICT)**: EVERY question you generate or select MUST be strictly based on topics listed in the course syllabus provided in the context. Do NOT generate questions on topics that are outside the syllabus, even if they are related to the broader subject. Cross-reference each question against the syllabus unit topics before including it.
   - **PYQ Priority — Per Unit (STRICT)**: Questions MUST be evenly distributed across all specified units. For EACH unit, follow this EXACT two-step process:
     - STEP 1 (SHOW ORIGINAL PYQs FIRST): Scan the provided context and extract ALL real PYQ questions that belong to that unit. Output them verbatim, exactly as written, labeled with a **(PYQ)** tag at the end of the question text (e.g., `### Question 1: What is a semaphore? **(PYQ)**`). Do NOT paraphrase or alter real PYQs.
     - STEP 2 (FILL WITH AI QUESTIONS): Count how many PYQs you found for that unit. If the count is less than the required quota, generate NEW questions to fill up the remaining slots. These AI-generated questions MUST perfectly mimic the exact style, pattern, difficulty, and topic distribution of the PYQs. Label them with **(AI Generated)** at the end.
     - STEP 3: Move to the next unit and repeat. Never over-pull from one unit at the expense of another.
   - **Topic Coverage — Within Each Unit (CRITICAL)**: Within each unit, questions MUST be spread across ALL topics listed in the syllabus for that unit. Ensure AT LEAST 1 question covers each topic. NEVER pile up questions on one topic while leaving another uncovered.
   - **University-Level Rigor**: Assume the student is a university undergraduate or postgraduate. Do NOT generate trivial or high-school level questions.
   - **Cross-Unit Style Matching (CRITICAL)**: Always analyze the exact style, pattern, and nature of the questions in the provided PYQs before generating AI questions.
   - For computational/numerical subjects (like Maths, Physics, Accounting, Engineering), questions MUST be practical problem-solving, numerical calculations, or derivations.
   - For programming/computer science subjects (like INT, CSE, MVC, Java, Python), subjective questions MUST heavily feature practical implementation.
   - **Realistic Scenarios**: Where possible, frame computational questions around real-world scenarios with specific, realistic data values.
4. PRACTICE QUESTIONS POLICY: If asked for practice questions, first use actual questions from the context. If you run out, INVENT highly relevant practice questions based on syllabus topics to match the style/difficulty of the real ones.
5. MID TERM POLICY (MANDATORY): Only apply when the user explicitly asks for mid term or mock test. Mid Terms cover ONLY Units 1, 2, and 3. Generate questions in one of these two formats based on what the user asks:
   - FORMAT A (MCQ): Output EXACTLY 40 MCQs — approximately 13-14 questions per unit (Unit 1, 2, 3).
   - FORMAT B (Subjective): Output 12-15 subjective questions — approximately 4-5 per unit (Unit 1, 2, 3), mix of short, medium, and long answer.
   If the user doesn't specify a format, ask them: "For this Mid Term, should I generate MCQ questions or Subjective questions?"
   UNIT DISTRIBUTION (MANDATORY): Process each unit individually — for each unit, FIRST output all real PYQs from context (labeled **PYQ**), THEN generate AI questions to fill the quota (labeled **AI Generated**). Do NOT over-pull from one unit. DO NOT stop early.
6. END TERM EXAM (ETE) POLICY (MANDATORY): Only apply when the user explicitly asks for end term, ETE, or final exam questions. The ETE covers ALL 6 UNITS of the course. Generate questions in one of these three formats based on what the user asks:
   - FORMAT A (Full MCQ): Output EXACTLY 60 MCQs across all 6 units. Distribution: Units 4, 5, 6 get 8-10 questions each; Units 1, 2, 3 get 4-6 questions each (total ~60).
   - FORMAT B (Mixed): Output 30 MCQs across all 6 units (5 per unit), followed by subjective questions (2-mark, 5-mark, 10-mark) across all 6 units.
   - FORMAT C (Subjective): Output exactly 7 long subjective questions (10-marks each) — 1 from each of Units 1-3, and 1-2 from each of Units 4-6.
   If the user doesn't specify a format, ask them: "For this ETE, should I generate a full MCQ paper (60 questions), a mixed paper (30 MCQs + subjective), or a fully subjective paper (7 long questions)?"
   UNIT DISTRIBUTION (MANDATORY): Process each of the 6 units individually. For each unit, FIRST output all real PYQs from context (labeled **PYQ**), THEN fill remaining quota with AI questions (labeled **AI Generated**). Units 4, 5, 6 MUST have more questions than Units 1, 2, 3. Never skip a unit. DO NOT stop early.
7. END TERM PRACTICAL (ETP) POLICY (MANDATORY): Only apply when the user explicitly asks for end term practical, ETP, or practical exam questions. Generate ONE comprehensive practical question that covers the MOST IMPORTANT practical topics spanning multiple units.
8. CLASS ASSESSMENT (CA) POLICY: Only apply when the user explicitly asks for CA, class test, class assessment, or unit test questions. Follow this EXACT flow:
   STEP 1 — If the user has NOT specified a course, ask: "Which course is this CA for?"
   STEP 2 — If the user has NOT specified which units, ask: "Which units does this CA cover?"
   STEP 3 — If the user has NOT specified the type, ask: "For this CA, should I generate MCQ questions or Subjective questions?"
   Only proceed to generate questions once you have all three pieces of information.
   CA MCQ FORMAT: Generate EXACTLY 30 MCQs evenly distributed across the specified units (e.g., 15 per unit for 2 units). CA SUBJECTIVE FORMAT: Generate 8-10 subjective questions (mix of 2-mark, 5-mark, 10-mark) evenly distributed across specified units.
9. CODE RESPONSE POLICY: When the user asks coding questions, ALWAYS wrap code in fenced markdown code blocks with the correct language tag.
10. MATH FORMATTING: You MUST use LaTeX for math. Use $ for inline and $$ for block math. NEVER use \\[, \\], \\(, or \\) for math.
11. NOTES POLICY: When the user asks for notes, use the provided source context. Provide detailed notes strictly focused on the specific unit or topics the user requested. If the context contains information from other units, ignore it. 
    - **Syllabus Coverage**: Cross-reference the requested unit against the syllabus (if available in context). Ensure EVERY topic and sub-topic from the syllabus for that unit is covered. If the provided context is missing a syllabus topic, you MUST generate the notes for that missing topic using your own general knowledge to ensure 100% completion.
    - **Extra Information**: If the notes context contains extra topics or information that are NOT explicitly in the syllabus but are highly relevant to the requested unit, include them as well. Do NOT summarize or skip any section that is relevant to the user's request.
12. GENERIC PYQ POLICY: If the user asks for PYQs but DOES NOT specify which exam type, you MUST ask: "Are you looking for PYQs for a CA, Mid Term, ETE, or ETP?"`;

        const apiMessages = [{ role: 'system', content: systemPrompt }];
        for (let i = 0; i < history.length - 1; i++) {
            apiMessages.push({ role: history[i].role, content: history[i].content });
        }

        // Apply policy reminders (same as original logic)
        let isMidTermRequest = !isSyllabusRequest && /\b(mid[\s-]?term|midterm|mock[\s-]?test|40\s*mcq)\b/i.test(content);
        let isEteRequest = !isSyllabusRequest && /\b(end[\s-]?term|ete|final[\s-]?exam|final[\s-]?paper|end[\s-]?sem|endsem)\b/i.test(content);
        let isEtpRequest = !isSyllabusRequest && /\b(etp|end[\s-]?term[\s-]?practical|practical[\s-]?exam|lab[\s-]?exam|viva)\b/i.test(content);
        let isCaRequest  = !isSyllabusRequest && /\b(ca|class[\s-]?assessment|class[\s-]?test|unit[\s-]?test|ca[\s-]?\d|ca\d)\b/i.test(content);

        let inheritedOriginalQuery = null;
        if (content.length < 80 && history.length > 1) {
            let lastAssistantMsg = null;
            for (let i = history.length - 2; i >= 0; i--) {
                if (history[i].role === 'assistant') { lastAssistantMsg = history[i].content; break; }
            }
            const isPyqFollowUp = lastAssistantMsg && /\bare you looking for pyqs\b/i.test(lastAssistantMsg);
            // Detect CA/exam follow-ups: short messages referring to units/formats OR asking to continue/add more
            const isExamFollowUp = lastAssistantMsg && /\b(mcq|subjective|format|multiple-choice|unit|units|type|question|questions|### Question)\b/i.test(lastAssistantMsg);
            const isContinuationRequest = /\b(unit|as well|more|also|now|add|next|continue|from)\b/i.test(content) && content.length < 60;
            if (isPyqFollowUp || isExamFollowUp || isContinuationRequest) {
                if (!isPyqFollowUp) {
                    if (/\b(CA|Class Assessment|ca\s*mcq|ca\s*question)\b/i.test(lastAssistantMsg)) isCaRequest = true;
                    if (/\b(ETE|End Term|Final Exam)\b/i.test(lastAssistantMsg)) isEteRequest = true;
                    if (/\b(Mid Term|Mock Test)\b/i.test(lastAssistantMsg)) isMidTermRequest = true;
                }
                for (let i = history.length - 3; i >= 0; i--) {
                    if (history[i].role === 'user' && history[i].content.length > content.length) {
                        inheritedOriginalQuery = history[i].content;
                        break;
                    }
                }
            }
        }

        let isNotesRequest = !isSyllabusRequest && !isMidTermRequest && !isEteRequest && !isEtpRequest && !isCaRequest && /\b(notes|study\s*material|lecture\s*notes|explain|explanation)\b/i.test(content);
        let isGenericPyqRequest = !isSyllabusRequest && !isMidTermRequest && !isEteRequest && !isEtpRequest && !isCaRequest && /\b(pyq|pyqs|previous year|past year|practice questions?)\b/i.test(content);
        const isJustCourseCode = content.trim().split(/\s+/).length <= 3 && /\b([a-zA-Z]{3})[-_\s]*(\d{3})\b/i.test(content);
        const isNoPolicyTriggered = !isSyllabusRequest && !isMidTermRequest && !isEteRequest && !isEtpRequest && !isCaRequest && !isNotesRequest && !isGenericPyqRequest;

        if (inheritedOriginalQuery && sourceData.length === 0) {
            const reSearchResults = await performHybridSearch(inheritedOriginalQuery, currentFilters);
            if (reSearchResults && reSearchResults.length > 0) {
                const newContext = reSearchResults.map((result, i) => `[Source ${i + 1} - ${result.metadata.title}]:\n${result.text}`).join('\n\n');
                apiMessages[0].content = apiMessages[0].content.replace(
                    /=== Context from University Documents ===[\s\S]*?===/,
                    `=== Context from University Documents ===\n${newContext}\n\n===`
                );
            }
        }

        let userQueryFinal = content;
        if (isSyllabusRequest) {
            userQueryFinal += "\n\n[REMINDER: SYLLABUS request. List ALL UNITS without skipping. Include textbooks if available.]";
        } else if (isMidTermRequest) {
            userQueryFinal += "\n\n[REMINDER: MID TERM request. Generate EXACTLY 40 MCQs from Units 1, 2, and 3. For each unit: FIRST output all real PYQ questions from context verbatim (labeled **PYQ**), THEN generate AI questions to fill remaining quota (labeled **AI Generated**). Match PYQ style exactly. Do NOT stop early.]";
        } else if (isEtpRequest) {
            userQueryFinal += "\n\n[REMINDER: ETP request. Generate one comprehensive practical question. Use real PYQ practical questions from context first if available, labeled **PYQ**.]";
        } else if (isEteRequest) {
            userQueryFinal += "\n\n[REMINDER: ETE request. Cover ALL 6 UNITS. Ask format if unspecified. For each unit: FIRST output all real PYQ questions verbatim (labeled **PYQ**), THEN generate AI questions to fill remaining quota (labeled **AI Generated**). Do NOT stop early.]";
        } else if (isCaRequest) {
            const userSpecifiedType = /\b(mcq|subjective|objective|coding|numerical|implementation|multiple[\s-]?choice)\b/i.test(content);
            if (userSpecifiedType) {
                userQueryFinal += "\n\n[REMINDER: CA request. Generate EXACTLY 30 MCQs evenly across specified units. For each unit: FIRST output all real PYQ questions from context verbatim (labeled **PYQ**), THEN generate AI questions to fill remaining quota (labeled **AI Generated**). Match PYQ style exactly. Do NOT stop early.]";
            } else {
                userQueryFinal += "\n\n[REMINDER: CA request. Ask for course, units, and question type before generating. Do NOT generate any questions yet.]";
            }
        } else if (isNotesRequest) {
            userQueryFinal += "\n\n[REMINDER: NOTES request. Use source notes strictly. Include code blocks for programming subjects and numerical examples for math/physics.]";
        } else if (isGenericPyqRequest) {
            userQueryFinal += "\n\n[REMINDER: GENERIC PYQ request. Ask: 'Are you looking for PYQs for a CA, Mid Term, ETE, or ETP?' Do NOT generate questions yet.]";
        } else if (isJustCourseCode && isNoPolicyTriggered) {
            userQueryFinal += "\n\n[REMINDER: User typed only the course code. Give a 1-sentence summary and ask what they need.]";
        }

        if (currentFilters.subject) {
            userQueryFinal += `\n\n[CRITICAL OVERRIDE: You are answering for ${currentFilters.subject}. Base your answer STRICTLY on the provided context. IGNORE conversation history about other courses.]`;
        }

        apiMessages.push({ role: 'user', content: userQueryFinal });

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 5: PRIMARY LLM — Qwen 3 via OpenRouter (streaming)
        // ═══════════════════════════════════════════════════════════════════════
        console.log(`[ChatController] Step 5: Streaming response from Qwen 3 (OpenRouter)...`);
        let fullAssistantResponse = '';
        let qwenFailed = false;

        try {
            const stream = await streamChatCompletion(apiMessages, 16000);

            // Parse OpenRouter SSE stream
            let buffer = '';
            await new Promise((resolve, reject) => {
                stream.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // keep incomplete last line

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') { resolve(); return; }
                        try {
                            const parsed = JSON.parse(data);
                            const token = parsed.choices?.[0]?.delta?.content || '';
                            if (token) {
                                fullAssistantResponse += token;
                                res.write(`data: ${JSON.stringify({ token })}\n\n`);
                            }
                        } catch (_) { /* skip malformed lines */ }
                    }
                });
                stream.on('end', resolve);
                stream.on('error', reject);
            });
        } catch (qwenErr) {
            console.error(`[ChatController] Qwen 3 streaming failed:`, qwenErr.message);
            qwenFailed = true;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 6: ANSWER VERIFICATION & OPENAI FALLBACK
        // ═══════════════════════════════════════════════════════════════════════
        const needsFallback = qwenFailed;

        if (needsFallback) {
            console.log(`[ChatController] Step 6: Qwen failed. Falling back to GPT-4o-mini...`);

            // If Qwen streamed something before failing confidence, clear it by notifying the client
            // (In practice the client will just append fallback tokens seamlessly)
            try {
                let fallbackResponse = '';
                const fallbackStream = await openaiClient.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: apiMessages,
                    max_tokens: 16000,
                    stream: true,
                });

                for await (const chunk of fallbackStream) {
                    const token = chunk.choices[0]?.delta?.content || '';
                    if (token) {
                        fallbackResponse += token;
                        res.write(`data: ${JSON.stringify({ token })}\n\n`);
                    }
                }

                // Save fallback response
                const assistantMessage = new Message({
                    conversationId,
                    role: 'assistant',
                    content: fallbackResponse,
                    sources: sourceData
                });
                await assistantMessage.save();
            } catch (fallbackErr) {
                console.error(`[ChatController] GPT-4o-mini fallback also failed:`, fallbackErr.message);
                // Save whatever Qwen produced as a last resort
                const assistantMessage = new Message({
                    conversationId, role: 'assistant',
                    content: fullAssistantResponse || 'Sorry, I encountered an error generating a response.',
                    sources: sourceData
                });
                await assistantMessage.save();
            }
        } else {
            // Qwen succeeded — save response
            console.log(`[ChatController] Qwen 3 generated answer successfully. Saving response.`);
            const finalAssistantMessage = new Message({
                conversationId,
                role: 'assistant',
                content: fullAssistantResponse,
                sources: sourceData
            });
            await finalAssistantMessage.save();
        }

        res.write(`data: [DONE]\n\n`);
        res.end();

    } catch (error) {
        console.error('Error in sendMessage:', error?.message || error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server error processing message' });
        } else {
            res.write(`data: ${JSON.stringify({ message: 'Error generating response. Please try again.' })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
        }
    }
};
// Delete a conversation
exports.deleteConversation = async (req, res) => {
    try {
        const conversationId = req.params.id;
        // Verify ownership
        const conversation = await Conversation.findOne({ _id: conversationId, userId: req.user._id });
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }
        
        // Delete the conversation and its messages
        await Message.deleteMany({ conversationId });
        await Conversation.deleteOne({ _id: conversationId });
        
        res.json({ success: true, message: 'Conversation deleted successfully' });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Toggle star status of a conversation
exports.toggleStarConversation = async (req, res) => {
    try {
        const conversationId = req.params.id;
        // Verify ownership
        const conversation = await Conversation.findOne({ _id: conversationId, userId: req.user._id });
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }
        
        conversation.isStarred = !conversation.isStarred;
        await conversation.save();
        
        res.json({ success: true, conversation });
    } catch (error) {
        console.error('Error toggling star:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
