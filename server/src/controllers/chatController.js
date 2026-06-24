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
        const courseAliases = {
            'mvc': 'INT 221',
            'mvc programming': 'INT 221',
            'developing': 'CSE 225',
            'dbms': 'CSE 332',
            'database': 'CSE 332'
        };
        
        const lowerContent = content.toLowerCase();
        for (const [alias, subjectCode] of Object.entries(courseAliases)) {
            if (new RegExp(`\\b${alias}\\b`, 'i').test(lowerContent)) {
                currentFilters.subject = subjectCode;
                break;
            }
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
            const historyText = history.map(m => m.content).join(" ");
            const histFullMatch = historyText.match(/\b([a-zA-Z]{3})[-_\s]*(\d{3})\b/i);
            const histNumMatch = historyText.match(/\b(\d{3})\b/);
            
            if (histFullMatch || histNumMatch) {
                try {
                    const courseCode = histFullMatch ? histFullMatch[1] : '';
                    const courseNum = histFullMatch ? histFullMatch[2] : histNumMatch[1];
                    const regexStr = courseCode ? `^${courseCode}[-_\\s]*${courseNum}$` : `^[A-Za-z]{3}[-_\\s]*${courseNum}$`;
                    const regexMatch = new RegExp(regexStr, 'i');
                    
                    const uniqueSubjects = await Document.distinct('subject', { subject: regexMatch });
                    if (uniqueSubjects.length > 0) {
                        currentFilters.subject = uniqueSubjects[0];
                    } else if (histFullMatch) {
                        currentFilters.subject = `${histFullMatch[1].toUpperCase()} ${histFullMatch[2]}`;
                    }
                } catch (err) {}
            }
        }

        // 5. Perform Hybrid Search to get context
        // Search across vector DB and MongoDB text index using the enriched filters
        const searchResults = await performHybridSearch(content, currentFilters);

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
1. RESPONSE MODE: By default, answer the user's question normally using the context. Do NOT generate exam questions unless the user EXPLICITLY asks for questions, practice, mock test, mid term, end term, CA, or ETP.
2. SYLLABUS POLICY: When the user asks for a syllabus, course overview, or "what is covered in [course]", present the syllabus as a clean, structured overview:
   - Start with the course name, code, and a brief description.
   - List each unit with its unit number as a heading (e.g., "**Unit 1: [Title]**") followed by the key topics covered.
   - Include credit hours, textbooks, and any other relevant info if available in the context.
   - Do NOT generate questions when the user asks for a syllabus. Just present the syllabus information clearly.
3. QUESTION NUMBERING (ONLY FOR QUESTION GENERATION): When you ARE generating questions (practice, exam, mock test, etc.), you MUST use a Markdown Heading 3 for EVERY single question: "### Question 1:", "### Question 2:", etc. This rule ONLY applies when generating questions, NOT for regular answers or syllabus responses.
4. PRACTICE QUESTIONS POLICY: If asked for practice questions, first use actual questions from the context. If you run out, INVENT highly relevant practice questions based on syllabus topics to match the style/difficulty of the real ones.
5. MID TERM POLICY (MANDATORY): Only apply when the user explicitly asks for mid term or mock test. Output EXACTLY 40 MCQs covering ONLY Units 1, 2, and 3. Number every question as '### Question 1:', '### Question 2:', etc. If context lacks 40 questions, invent the rest from syllabus topics. DO NOT stop early.
6. END TERM EXAM (ETE) POLICY (MANDATORY): Only apply when the user explicitly asks for end term, ETE, or final exam questions. The ETE covers ALL 6 UNITS of the course. Generate questions in one of these two formats based on what the user asks:
   - FORMAT A (Full MCQ): Output EXACTLY 60 MCQs across all 6 units. Since Units 1-3 are already covered in the Mid Term, FOCUS MORE on Units 4, 5, and 6 (roughly 8-10 questions each from Units 4/5/6, and 4-6 questions each from Units 1/2/3). Base questions on the provided PYQs and syllabus context — model the style and difficulty after real exam questions. Invent any remaining questions from syllabus topics.
   - FORMAT B (Mixed): Output 30 MCQs across all 6 units (with the same unit weighting — more from Units 4/5/6), followed by subjective/long-answer questions (2-mark, 5-mark, and 10-mark questions) spread across all 6 units. Base all questions on PYQs and syllabus context.
   If the user doesn't specify a format, ask them: "Should I generate a full MCQ paper (60 questions) or a mixed paper (30 MCQs + subjective questions)?"
   If context lacks enough questions, invent the rest from syllabus topics. DO NOT stop early.
7. END TERM PRACTICAL (ETP) POLICY (MANDATORY): Only apply when the user explicitly asks for end term practical, ETP, or practical exam questions. This exam tests hands-on implementation skills. Generate ONE comprehensive practical question (or a small set of 2-3 related questions) that:
   - Covers the MOST IMPORTANT practical topics spanning multiple units of the course.
   - Is based on actual PYQs and syllabus practical topics from the provided context.
   - Describes a real-world problem or task the student must implement/solve.
   - Includes clear requirements, expected output/behavior, and any constraints.
   - May include sub-parts (a, b, c) that build on each other to test different skills progressively.
   Model the style after the provided PYQ practical questions. If no PYQs are available, generate a realistic practical question based on syllabus topics.
8. CLASS ASSESSMENT (CA) POLICY: Only apply when the user explicitly asks for CA, class test, class assessment, or unit test questions. Follow this EXACT flow:
   STEP 1 — If the user has NOT specified a course, ask: "Which course is this CA for? (e.g., CSE 332, MTH 174)"
   STEP 2 — If the user has NOT specified which units, ask: "Which units does this CA cover? (e.g., Unit 1 and 2)"
   STEP 3 — If the user has NOT specified the type, ask: "Should I generate MCQ questions or Subjective questions?"
   Only proceed to generate questions once you have all three pieces of information (course, units, type).
   - IF MCQ: Generate EXACTLY 30 MCQs strictly from the specified units only. Base questions on PYQs from those units (to match question style and difficulty) and the syllabus topics. Invent the rest if context lacks 30 questions. Number every question as '### Question 1:', '### Question 2:', etc.
   - IF SUBJECTIVE: Generate a mix of short-answer (2-mark), medium-answer (5-mark), and long-answer (10-mark) questions from the specified units, totalling around 10-15 questions. Base on PYQs and syllabus.
9. CODE RESPONSE POLICY: When the user asks coding questions, programming help, or anything involving code:
   - ALWAYS wrap code in fenced markdown code blocks with the correct language tag (e.g., \`\`\`python, \`\`\`java, \`\`\`c, \`\`\`javascript, \`\`\`sql, etc.).
   - Provide clear explanations before and after the code.
   - For multi-file or multi-step code, use separate code blocks for each file/step with descriptive headings.
   - Use inline code (\`like this\`) for variable names, function names, and short code references within text.
   - Include comments inside the code to explain key logic.
10. MATH FORMATTING: You MUST use LaTeX for math. Use $ for inline (e.g., $E = mc^2$) and $$ for block math. NEVER use \\[, \\], \\(, or \\) for math.`;

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
        // Check for syllabus request FIRST — it should never trigger exam policies
        const isSyllabusRequest = /\b(syllabus|course\s*overview|course\s*outline|course\s*content|what\s*is\s*covered|topics\s*covered|course\s*structure)\b/i.test(content);
        const isMidTermRequest = !isSyllabusRequest && /\b(mid[\s-]?term|midterm|mock[\s-]?test|40\s*mcq)\b/i.test(content);
        const isEteRequest = !isSyllabusRequest && /\b(end[\s-]?term|ete|final[\s-]?exam|final[\s-]?paper|end[\s-]?sem|endsem)\b/i.test(content);
        const isEtpRequest = !isSyllabusRequest && /\b(etp|end[\s-]?term[\s-]?practical|practical[\s-]?exam|lab[\s-]?exam|viva)\b/i.test(content);
        const isCaRequest  = !isSyllabusRequest && /\b(ca|class[\s-]?assessment|class[\s-]?test|unit[\s-]?test|ca[\s-]?\d|ca\d)\b/i.test(content);

        let userQueryFinal = content;
        if (isSyllabusRequest) {
            userQueryFinal = content + "\n\n[REMINDER: The user is asking about the SYLLABUS. Do NOT generate questions. Present the syllabus as a clean, structured overview with unit-wise topics, course description, textbooks, and other relevant info from the context.]"
        } else if (isMidTermRequest) {
            userQueryFinal = content + "\n\n[REMINDER: MID TERM request detected. Generate EXACTLY 40 MCQs from Units 1, 2 and 3 only. Number as '### Question 1:', '### Question 2:', etc. Do NOT stop early.]"
        } else if (isEtpRequest) {
            userQueryFinal = content + "\n\n[REMINDER: END TERM PRACTICAL (ETP) request detected. Generate one comprehensive practical question (with sub-parts if needed) covering the most important practical topics across multiple units. Base it on the PYQs and syllabus in the context. Make it feel like a real hands-on implementation task.]"
        } else if (isEteRequest) {
            userQueryFinal = content + "\n\n[REMINDER: END TERM EXAM (ETE) request detected. Cover ALL 6 UNITS. If user wants full MCQ: 60 questions with more focus on Units 4/5/6. If mixed: 30 MCQs + subjective questions across all 6 units. If not specified, ask the user which format they prefer. Number every question as '### Question 1:', etc. Do NOT stop early.]"
        } else if (isCaRequest) {
            userQueryFinal = content + "\n\n[REMINDER: CLASS ASSESSMENT (CA) request detected. Follow the CA POLICY exactly: check if the user has provided (1) course name, (2) specific units, and (3) question type (MCQ or Subjective). Ask for any missing info before generating. If MCQ: Generate EXACTLY 30 MCQs from specified units only. DO NOT stop early. If Subjective: 10-15 questions (2-mark, 5-mark, 10-mark mix). Base all questions on PYQs and syllabus.]"
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
