const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { performHybridSearch } = require('../services/search.service');
const { openaiClient } = require('../services/openai.service');
const Document = require('../models/Document');

// Get all conversations for a user
exports.getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({ userId: req.user._id })
            .sort({ updatedAt: -1 })
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
    const { content, filters } = req.body;
    const conversationId = req.params.id;

    if (!content) {
        return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    // Auto-extract course codes (e.g., "int 221", "CSE332", "174") from user query to strictly filter sources
    let currentFilters = filters || {};
    
    // Check for syllabus request early to enforce category filter
    const isSyllabusRequest = /\b(syllabus|course\s*overview|course\s*outline|course\s*content|what\s*is\s*covered|topics\s*covered|course\s*structure)\b/i.test(content);
    if (isSyllabusRequest) {
        currentFilters.category = 'syllabus';
    }

    const fullCourseMatch = content.match(/\b([a-zA-Z]{3})[-_\s]*(\d{3})\b/i);
    const numCourseMatch = content.match(/\b(\d{3})\b/);
    
    if (fullCourseMatch || numCourseMatch) {
        try {
            const courseCode = fullCourseMatch ? fullCourseMatch[1] : '';
            const courseNum = fullCourseMatch ? fullCourseMatch[2] : numCourseMatch[1];
            // Match with or without spaces/dashes (e.g. PHY 110, PHY110, PHY-110)
            const regexStr = courseCode ? `^${courseCode}[-_\\s]*${courseNum}$` : `^[A-Za-z]{3}[-_\\s]*${courseNum}$`;
            const regexMatch = new RegExp(regexStr, 'i');
            
            const uniqueSubjects = await Document.distinct('subject', { subject: regexMatch });
            if (uniqueSubjects.length > 0) {
                // If found in DB, use the exact string from the DB (e.g. "PHY110" or "INT-221")
                currentFilters.subject = uniqueSubjects[0];
            } else if (fullCourseMatch) {
                // Fallback to exactly what the user typed if not in DB yet
                currentFilters.subject = `${fullCourseMatch[1].toUpperCase()} ${fullCourseMatch[2]}`;
            }
        } catch (err) {
            console.error('Error resolving course number alias:', err);
        }
    }

    if (!currentFilters.subject) {
        // Fallback to alias mapping if they type the course name instead of the code
        try {
            // Fetch dynamically from syllabus documents
            const syllabi = await Document.find({ category: 'syllabus' }).select('title subject -_id').lean();
            
            // Base aliases
            const courseAliases = {
                'mvc': 'INT 221',
                'mvc programming': 'INT 221',
                'developing': 'CSE 225',
                'dbms': 'CSE 332',
                'database': 'CSE 332'
            };

            // Dynamically add aliases from uploaded syllabus documents
            for (const doc of syllabi) {
                if (doc.title && doc.subject) {
                    const cleanAlias = doc.title.toLowerCase()
                                        .replace(/\b(syllabus|for|course)\b/g, '')
                                        .trim()
                                        .replace(/\s+/g, ' '); // Clean extra spaces
                    if (cleanAlias.length > 3) {
                        courseAliases[cleanAlias] = doc.subject;
                    }
                }
            }
            
            const lowerContent = content.toLowerCase();
            for (const [alias, subjectCode] of Object.entries(courseAliases)) {
                // Escape regex specials from the alias to prevent invalid regex
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
        // 1. Verify conversation belongs to user
        const conversation = await Conversation.findOne({ _id: conversationId, userId: req.user._id });
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // 2. Save user message
        const userMessage = new Message({
            conversationId,
            role: 'user',
            content
        });
        await userMessage.save();

        // 3. Update conversation title if it's the first message
        const messageCount = await Message.countDocuments({ conversationId });
        if (messageCount === 1) {
            conversation.title = content.substring(0, 40) + (content.length > 40 ? '...' : '');
            await conversation.save();
        }

        // 4. Fetch conversation history (last 10 messages) to understand context
        const history = await Message.find({ conversationId })
            .sort({ createdAt: -1 })
            .limit(11) // includes the one we just saved
            .lean();
        history.reverse();

        // 4.5. If no subject is found in current message, fallback to history
        if (!currentFilters.subject) {
            // Search from the most recent message backwards
            for (let i = history.length - 1; i >= 0; i--) {
                const histFullMatch = history[i].content.match(/\b([a-zA-Z]{3})[-_\s]*(\d{3})\b/i);
                const histNumMatch = history[i].content.match(/\b(\d{3})\b/);
                
                if (histFullMatch || histNumMatch) {
                    try {
                        const courseCode = histFullMatch ? histFullMatch[1] : '';
                        const courseNum = histFullMatch ? histFullMatch[2] : histNumMatch[1];
                        const regexStr = courseCode ? `^${courseCode}[-_\\s]*${courseNum}$` : `^[A-Za-z]{3}[-_\\s]*${courseNum}$`;
                        const regexMatch = new RegExp(regexStr, 'i');
                        
                        const uniqueSubjects = await Document.distinct('subject', { subject: regexMatch });
                        if (uniqueSubjects.length > 0) {
                            currentFilters.subject = uniqueSubjects[0];
                            break;
                        } else if (histFullMatch) {
                            currentFilters.subject = `${histFullMatch[1].toUpperCase()} ${histFullMatch[2]}`;
                            break;
                        }
                    } catch (err) {}
                }
            }
        }

        // 5. Perform Hybrid Search to get context
        // Search across vector DB and MongoDB text index using the enriched filters
        let searchResults = await performHybridSearch(content, currentFilters);

        // Build context string from search results
        let contextText = "";
        const sourceData = [];
        if (searchResults && searchResults.length > 0) {
            contextText = searchResults.map((result, i) => `[Source ${i + 1} - ${result.metadata.title}]:\n${result.text}`).join('\n\n');
            
            // Collect sources to save with the assistant message later
            searchResults.forEach(res => {
                sourceData.push({
                    chunkId: res.chunkId,
                    documentId: res.documentId,
                    title: res.metadata.title,
                    text: res.text,
                    fileUrl: res.metadata.fileUrl || '',
                    fileType: res.metadata.fileType || '',
                    category: res.metadata.category || '',
                    subject: res.metadata.subject || '',
                    files: res.metadata.files || [],
                });
            });
        }

        // 6. Construct OpenAI Messages Array
        const systemPrompt = `You are Verto AI, an expert teaching assistant for university students. 
Answer the user's questions based primarily on the provided context from university documents.
If the answer is not in the context, say "I don't have enough information in the provided documents to answer that definitively." but you can offer general knowledge if appropriate, making sure to clarify it's not from the course material.
Use markdown formatting to make your answers professional, highly structured, and easy to read:
- ALWAYS break down complex information into bullet points or numbered lists.
- Avoid long, dense paragraphs. Use bold text to highlight key terms.
- For step-by-step guides, use numbered lists.

=== Context from University Documents ===
${contextText ? contextText : "No relevant context found in the database."}

=== FINAL CRITICAL INSTRUCTIONS ===
1. RESPONSE MODE: By default, act like a normal conversational chatbot. If the user only types a course name or code (e.g., "INT 108" or "python"), give a brief 1-2 sentence description of the course and ask them what they need help with (e.g., "Would you like to see the syllabus, study notes, or practice questions?"). Do NOT dump the entire syllabus, notes, or generate questions unless they explicitly ask for them. Only trigger exam/notes/syllabus policies when their specific keywords are present.
2. SYLLABUS POLICY: When the user asks for a syllabus, course overview, or "what is covered in [course]", present the syllabus as a clean, structured overview:
   - Start with the course name, code, and a brief description.
   - List EVERY single unit from the context (typically ALL 6 UNITS) with its unit number as a heading (e.g., "**Unit 1: [Title]**") followed by the key topics covered.
   - Do NOT skip any units. DO NOT stop early.
   - Include credit hours, textbooks, and any other relevant info if available in the context.
   - Do NOT generate questions when the user asks for a syllabus. Just present the syllabus information clearly.
3. QUESTION GENERATION GUIDELINES: When generating any questions (practice, exams, mock tests):
   - Number every question using a Markdown Heading 3: "### Question 1:", "### Question 2:", etc.
   - **University-Level Rigor**: Assume the student is a university undergraduate or postgraduate. Do NOT generate trivial or high-school level questions. Problems must require multi-step reasoning, synthesis of multiple concepts, or advanced application.
   - **Cross-Unit Style Matching (CRITICAL)**: Always analyze the exact style, pattern, and nature of the questions in the provided PYQs (e.g., highly numerical, code-heavy implementation, circuit diagrams, practical case-studies, or derivation-heavy). If you need to invent questions for a unit that is NOT covered by the PYQs, you MUST ensure the newly invented questions perfectly mimic the exact rigor and style of the provided PYQs. For example, if the PYQs ask for working code, the new questions must ask for working code. If the PYQs are heavily numerical/physics derivations, the new questions must be numerical/derivations. Do NOT fall back to generic theoretical definitions unless the PYQs themselves are purely theoretical.
   - For computational/numerical subjects (like Maths, Physics, Accounting, Engineering), questions MUST be practical problem-solving, numerical calculations, or derivations. Do NOT generate simple definitional or theoretical questions (e.g., "Define a function") unless explicitly present in the PYQs. Force the student to solve real numerical problems.
   - For programming/computer science subjects (like INT, CSE, MVC, Java, Python), subjective questions MUST heavily feature practical implementation. Ask the student to write actual code snippets, build features, trace outputs, or debug issues. Do NOT generate basic theoretical definitions (e.g., "Describe MVC") unless heavily prominent in the PYQs.
   - **Realistic Scenarios**: Where possible, frame computational questions around real-world or industry-specific scenarios (e.g., data structures, engineering mechanics, business analytics) with specific, realistic data values.
4. PRACTICE QUESTIONS POLICY: If asked for practice questions, first use actual questions from the context. If you run out, INVENT highly relevant practice questions based on syllabus topics to match the style/difficulty of the real ones.
5. MID TERM POLICY (MANDATORY): Only apply when the user explicitly asks for mid term or mock test. Output EXACTLY 40 MCQs covering ONLY Units 1, 2, and 3. Number every question as '### Question 1:', '### Question 2:', etc. FIRST PREFERENCE: Extract questions directly from provided PYQs. If more are needed, generate new questions that strictly follow the PYQ pattern using the syllabus and course notes context. DO NOT stop early.
6. END TERM EXAM (ETE) POLICY (MANDATORY): Only apply when the user explicitly asks for end term, ETE, or final exam questions. The ETE covers ALL 6 UNITS of the course. Generate questions in one of these three formats based on what the user asks:
   - FORMAT A (Full MCQ): Output EXACTLY 60 MCQs across all 6 units. FOCUS MORE on Units 4, 5, and 6 (8-10 from Units 4/5/6, and 4-6 from Units 1/2/3). 
   - FORMAT B (Mixed): Output 30 MCQs across all 6 units, followed by subjective questions (2-mark, 5-mark, 10-mark) across all 6 units.
   - FORMAT C (Subjective): Output exactly 7 long subjective questions (10-marks each) spanning across all 6 units.
   If the user doesn't specify a format, ask them: "Should I generate a full MCQ paper (60 questions), a mixed paper (30 MCQs + subjective), or a fully subjective paper (7 long questions)?"
   SOURCE PRIORITY & UNIT MATCHING (CRITICAL): You MUST strictly adhere to the unit distribution requirements. Map the provided PYQs to their respective syllabus units. If the PYQs only cover certain units (e.g., they are Mid Term questions for Units 1-3), DO NOT just dump all of them. You MUST invent new questions for the missing units (Units 4, 5, 6) to fulfill the ETE coverage requirements. Synthesize these new questions to perfectly match the difficulty and pattern of the provided PYQs. DO NOT stop early.
7. END TERM PRACTICAL (ETP) POLICY (MANDATORY): Only apply when the user explicitly asks for end term practical, ETP, or practical exam questions. This exam tests hands-on implementation skills. Generate ONE comprehensive practical question (or a small set of 2-3 related questions) that:
   - Covers the MOST IMPORTANT practical topics spanning multiple units.
   - Describes a real-world problem or task the student must implement/solve.
   - Includes clear requirements, expected output/behavior, and any constraints.
   - May include sub-parts (a, b, c).
   SOURCE PRIORITY: FIRST PREFERENCE is to use actual PYQ practical questions. If none are available, create a realistic question matching the PYQ pattern by synthesizing the syllabus practical topics and course notes.
8. CLASS ASSESSMENT (CA) POLICY: Only apply when the user explicitly asks for CA, class test, class assessment, or unit test questions. Follow this EXACT flow:
   STEP 1 — If the user has NOT specified a course, ask: "Which course is this CA for? (e.g., CSE 332, MTH 174)"
   STEP 2 — If the user has NOT specified which units, ask: "Which units does this CA cover? (e.g., Unit 1 and 2)"
   STEP 3 — If the user has NOT specified the type, ask: "Should I generate MCQ questions or Subjective questions?"
   Only proceed to generate questions once you have all three pieces of information (course, units, type).
   - IF MCQ: Generate EXACTLY 30 MCQs strictly from the specified units.
   - IF SUBJECTIVE for CODING/PROGRAMMING subjects (INT, CSE, MVC, Java, Python, Web Dev, etc.): Generate 10-15 CODE IMPLEMENTATION questions. Each question MUST ask the student to write actual working code — e.g., "Write a Laravel route that...", "Create a PHP function that...", "Implement a controller method that...". Take the topics from the specified units in the syllabus. Use PYQ patterns and notes as reference for the types of programs asked. Do NOT ask definitions like "What is MVC?" or "Explain routing". Every question must require the student to write code.
   - IF SUBJECTIVE for MATHS/PHYSICS/NUMERICAL subjects: Generate 10-15 numerical problem-solving, calculation, or derivation questions. Do NOT ask definitions.
   - IF SUBJECTIVE for OTHER subjects: Generate a mix of short (2-mark), medium (5-mark), and long-answer (10-mark) questions.
   SOURCE PRIORITY (ALL FORMATS): FIRST PREFERENCE is to pull directly from provided PYQs. If you run out of PYQs, generate new questions that strictly follow the exact pattern and difficulty of the PYQs, using the syllabus topics and notes as reference. Number every question properly. DO NOT stop early.
9. CODE RESPONSE POLICY: When the user asks coding questions, programming help, or anything involving code:
   - ALWAYS wrap code in fenced markdown code blocks with the correct language tag (e.g., \`\`\`python, \`\`\`java, \`\`\`c, \`\`\`javascript, \`\`\`sql, etc.).
   - Provide clear explanations before and after the code.
   - For multi-file or multi-step code, use separate code blocks for each file/step with descriptive headings.
   - Use inline code (\`like this\`) for variable names, function names, and short code references within text.
   - Include comments inside the code to explain key logic.
10. MATH FORMATTING: You MUST use LaTeX for math. Use $ for inline (e.g., $E = mc^2$) and $$ for block math. NEVER use \\[, \\], \\(, or \\) for math.
11. NOTES POLICY: When the user asks for notes or study material, strictly fetch all details from the provided source notes. If notes are unavailable, generate comprehensive notes using the syllabus context. Do NOT just provide theory: for math and physics subjects, include relevant questions and step-by-step solutions; for coding subjects, include functional sample codes. Structure the notes beautifully.
12. GENERIC PYQ POLICY: If the user asks for PYQs, past year questions, or practice questions, but DOES NOT specify which exam type (CA, Mid Term, ETE, or ETP), you MUST ask them: "Are you looking for PYQs for a CA, Mid Term, ETE, or ETP?" Do not generate a massive list of questions until they specify the exam type.`;

        const apiMessages = [
            { role: 'system', content: systemPrompt }
        ];

        // Add history (excluding the very last user message which we add manually)
        for (let i = 0; i < history.length - 1; i++) {
            apiMessages.push({
                role: history[i].role,
                content: history[i].content
            });
        }

        // Conditionally append exam-specific reminder based on user intent
        // isSyllabusRequest is already evaluated at the start of the function
        let isMidTermRequest = !isSyllabusRequest && /\b(mid[\s-]?term|midterm|mock[\s-]?test|40\s*mcq)\b/i.test(content);
        let isEteRequest = !isSyllabusRequest && /\b(end[\s-]?term|ete|final[\s-]?exam|final[\s-]?paper|end[\s-]?sem|endsem)\b/i.test(content);
        let isEtpRequest = !isSyllabusRequest && /\b(etp|end[\s-]?term[\s-]?practical|practical[\s-]?exam|lab[\s-]?exam|viva)\b/i.test(content);
        let isCaRequest  = !isSyllabusRequest && /\b(ca|class[\s-]?assessment|class[\s-]?test|unit[\s-]?test|ca[\s-]?\d|ca\d)\b/i.test(content);
        
        // Inherit policy if the user is answering a clarification question from the assistant
        let inheritedOriginalQuery = null;
        if (content.length < 80 && history.length > 1) {
            let lastAssistantMsg = null;
            for (let i = history.length - 2; i >= 0; i--) {
                if (history[i].role === 'assistant') {
                    lastAssistantMsg = history[i].content;
                    break;
                }
            }
            const isPyqFollowUp = lastAssistantMsg && /\bare you looking for pyqs\b/i.test(lastAssistantMsg);
            
            if (isPyqFollowUp || (lastAssistantMsg && /\b(mcq|subjective|format|multiple-choice|unit|units|type)\b/i.test(lastAssistantMsg))) {
                
                // Only inherit flags if it's NOT the PYQ question (since the PYQ question lists all exams, forcing flags would trigger all policies)
                if (!isPyqFollowUp) {
                    if (/\b(CA|Class Assessment)\b/i.test(lastAssistantMsg)) isCaRequest = true;
                    if (/\b(ETE|End Term|Final Exam)\b/i.test(lastAssistantMsg)) isEteRequest = true;
                    if (/\b(Mid Term|Mock Test)\b/i.test(lastAssistantMsg)) isMidTermRequest = true;
                }
                
                // Find the original user request that started this flow to enrich the search
                for (let i = history.length - 3; i >= 0; i--) {
                    if (history[i].role === 'user' && history[i].content.length > content.length) {
                        inheritedOriginalQuery = history[i].content;
                        break;
                    }
                }
            }
        }

        let isNotesRequest = !isSyllabusRequest && !isMidTermRequest && !isEteRequest && !isEtpRequest && !isCaRequest && /\b(notes|study\s*material|lecture\s*notes)\b/i.test(content);
        let isGenericPyqRequest = !isSyllabusRequest && !isMidTermRequest && !isEteRequest && !isEtpRequest && !isCaRequest && /\b(pyq|pyqs|previous year|past year|practice questions?)\b/i.test(content);
        
        const isJustCourseCode = content.trim().split(/\s+/).length <= 3 && /\b([a-zA-Z]{3})[-_\s]*(\d{3})\b/i.test(content);
        const isNoPolicyTriggered = !isSyllabusRequest && !isMidTermRequest && !isEteRequest && !isEtpRequest && !isCaRequest && !isNotesRequest && !isGenericPyqRequest;

        // Re-run search with the original query if the short follow-up yielded no results
        if (inheritedOriginalQuery && sourceData.length === 0) {
            const reSearchResults = await performHybridSearch(inheritedOriginalQuery, currentFilters);
            if (reSearchResults && reSearchResults.length > 0) {
                contextText = reSearchResults.map((result, i) => `[Source ${i + 1} - ${result.metadata.title}]:\n${result.text}`).join('\n\n');
                reSearchResults.forEach(res => {
                    sourceData.push({
                        chunkId: res.chunkId,
                        documentId: res.documentId,
                        title: res.metadata.title,
                        text: res.text,
                        fileUrl: res.metadata.fileUrl || '',
                        fileType: res.metadata.fileType || '',
                        category: res.metadata.category || '',
                        subject: res.metadata.subject || '',
                        files: res.metadata.files || [],
                    });
                });
            }
        }

        let userQueryFinal = content;
        if (isSyllabusRequest) {
            userQueryFinal = content + "\n\n[REMINDER: The user is asking about the SYLLABUS. Do NOT generate questions. Present the syllabus as a clean, structured overview. Make sure to list ALL UNITS (typically all 6 units) without skipping any and do NOT stop early. Include textbooks if available.]"
        } else if (isMidTermRequest) {
            userQueryFinal = content + "\n\n[REMINDER: MID TERM request detected. Generate EXACTLY 40 MCQs from Units 1, 2 and 3 only. Number as '### Question 1:', '### Question 2:', etc. FIRST PREFERENCE: Use PYQs. Then use syllabus and notes to match the PYQ pattern. STYLE RULE: Study the provided PYQ questions carefully — if they are numerical/computational (contain formulas, calculations, values to solve), ALL your generated questions MUST also be numerical/computational. If the PYQs contain code, your questions must contain code. NEVER generate generic theoretical 'What is X?' or 'Define Y' questions unless the PYQs themselves are purely theoretical. Do NOT stop early.]"
        } else if (isEtpRequest) {
            userQueryFinal = content + "\n\n[REMINDER: END TERM PRACTICAL (ETP) request detected. Generate one comprehensive practical question. FIRST PREFERENCE: Use actual PYQs. If none, match PYQ pattern using syllabus and notes. STYLE RULE: Study the provided PYQ questions carefully — if they require writing code, your question must require writing code. If they require solving numerical problems, your question must require solving numerical problems. NEVER generate generic theoretical questions.]"
        } else if (isEteRequest) {
            userQueryFinal = content + "\n\n[REMINDER: END TERM EXAM (ETE) request detected. Cover ALL 6 UNITS. Ask format if unspecified (60 MCQ, Mixed, or Fully Subjective). CRITICAL SOURCE RULE: Map provided PYQs to syllabus units. If provided PYQs only cover early units, DO NOT dump them all. You MUST invent new questions for the missing units. STYLE RULE (MANDATORY): Before generating, study the exact nature of the provided PYQ questions. If they are numerical (contain equations, values, formulas, calculations), then EVERY question you invent for the missing units MUST ALSO be numerical — give actual numbers, formulas, and values to compute. If they are code-based, give code-based questions. NEVER fall back to generic 'What is X?' or 'Define Y' theoretical questions unless the PYQs themselves are purely theoretical.]"
        } else if (isCaRequest) {
            const userSpecifiedType = /\b(mcq|subjective|objective|coding|numerical|implementation|multiple[\s-]?choice)\b/i.test(content);
            if (userSpecifiedType) {
                userQueryFinal = content + "\n\n[REMINDER: CLASS ASSESSMENT (CA) request detected. The user has specified the question type. Generate questions NOW. FIRST PREFERENCE: Extract from PYQs. Then match PYQ pattern using syllabus topics and notes. STYLE RULE (MANDATORY): Before generating, study the exact nature of the provided PYQ questions. If they are numerical (contain equations, values, formulas, calculations), then EVERY question you generate MUST ALSO be numerical — give actual numbers, formulas, and values to compute. If they are code-based, give code to write. NEVER fall back to generic 'What is X?' or 'Define Y' theoretical questions unless the PYQs themselves are purely theoretical. RULES BY SUBJECT TYPE: (1) For CODING subjects (INT, CSE, MVC, Java, Python): Subjective questions MUST be CODE IMPLEMENTATION — ask the student to WRITE working code. (2) For MATHS/PHYSICS: Subjective must be numerical problems with actual values. (3) For MCQs: Generate EXACTLY 30 MCQs. DO NOT stop early.]"
            } else {
                userQueryFinal = content + "\n\n[REMINDER: CLASS ASSESSMENT (CA) request detected. Check if the user has specified: (1) course, (2) units, and (3) question type. If ANY of these are missing, you MUST ask before generating. Specifically, if the question type is not specified, ask: 'Should I generate MCQ questions or Subjective questions?' Do NOT assume a type. Do NOT start generating questions until all three are confirmed.]"
            }
        } else if (isNotesRequest) {
            userQueryFinal = content + "\n\n[REMINDER: NOTES request detected. Fetch all details STRICTLY from the provided source notes. If unavailable, generate using the syllabus. Do NOT just provide theory: include questions and solutions for math/physics, and sample code blocks for programming subjects. Format beautifully with headings and lists.]"
        } else if (isGenericPyqRequest) {
            userQueryFinal = content + "\n\n[REMINDER: GENERIC PYQ request detected. The user asked for PYQs but DID NOT specify the exam type. You MUST ask them: 'Are you looking for PYQs for a CA, Mid Term, ETE, or ETP?' Do NOT generate any questions yet.]"
        } else if (isJustCourseCode && isNoPolicyTriggered) {
            userQueryFinal = content + "\n\n[REMINDER: The user only typed the course code. DO NOT output the syllabus. DO NOT output notes or questions. Just give a 1-sentence brief summary of the course and directly ask the user what they need (e.g., 'Do you need the syllabus, study notes, or practice questions?').]";
        }

        // Force context override to prevent history bleeding
        if (currentFilters.subject) {
            userQueryFinal += `\n\n[CRITICAL OVERRIDE: You are currently answering for ${currentFilters.subject}. Base your answer STRICTLY on the 'Context from University Documents' provided in the system prompt. IGNORE any conversation history regarding other courses.]`;
        }

        apiMessages.push({ role: 'user', content: userQueryFinal });

        // 7. Setup SSE Headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send sources immediately as the first event so UI can display citations
        res.write(`event: sources\ndata: ${JSON.stringify(sourceData)}\n\n`);

        // 8. Call OpenAI with streaming
        const stream = await openaiClient.chat.completions.create({
            model: "gpt-4o-mini",
            messages: apiMessages,
            max_tokens: 8000,
            stream: true,
        });

        let fullAssistantResponse = "";

        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || "";
            if (token) {
                fullAssistantResponse += token;
                // SSE format: data: <payload>\n\n
                // We stringify the token to safely handle newlines and special characters
                res.write(`data: ${JSON.stringify({ token })}\n\n`);
            }
        }

        // 9. Save assistant message to DB
        const assistantMessage = new Message({
            conversationId,
            role: 'assistant',
            content: fullAssistantResponse,
            sources: sourceData
        });
        await assistantMessage.save();

        // End stream
        res.write(`event: done\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();

    } catch (error) {
        console.error('Error in sendMessage:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server error processing message' });
        } else {
            // If headers are already sent, stream an error event
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ message: 'Error generating response.' })}\n\n`);
            res.end();
        }
    }
};
