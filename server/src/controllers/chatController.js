const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { performHybridSearch } = require('../services/search.service');
const { openaiClient } = require('../services/openai.service');
const Document = require('../models/Document');
const { computeConfidence, getProvidersWaterfall, createThinkFilter, markProviderFailure } = require('../services/llm.service');
const { streamBatchedQuestions } = require('../services/questionBatcher');

// ---------------------------------------------------------------------------
// extractCaUnits
// ---------------------------------------------------------------------------
/**
 * Parses unit numbers from the user's message and conversation history.
 * Handles patterns like:
 *   "unit 1 and 2"  →  [1, 2]
 *   "units 1, 2, 3" →  [1, 2, 3]
 *   "unit 1 to 3"   →  [1, 2, 3]
 *
 * @param {string}   content  — current user message
 * @param {object[]} history  — Message objects with .content
 * @returns {number[]} sorted unique unit numbers in [1..6]
 */
const extractCaUnits = (content, history = []) => {
    // Search current message first, then walk back through history
    const sources = [content, ...history.map(h => h.content || '')];

    for (const src of sources) {
        // Range pattern: "unit 1 to 3"
        const rangeMatch = src.match(/units?\s*(\d+)\s*(?:to|through|-)\s*(\d+)/i);
        if (rangeMatch) {
            const from = parseInt(rangeMatch[1], 10);
            const to   = parseInt(rangeMatch[2], 10);
            const units = [];
            for (let i = from; i <= to && i <= 6; i++) units.push(i);
            if (units.length) return units;
        }

        // List / "and" pattern: "units 1, 2" or "unit 1 and unit 2"
        const listMatch = src.match(/units?\s*([\d\s,and&+]+)/i);
        if (listMatch) {
            const nums = listMatch[1].match(/\d+/g);
            if (nums) {
                const units = [...new Set(nums.map(Number).filter(n => n >= 1 && n <= 6))]
                    .sort((a, b) => a - b);
                if (units.length) return units;
            }
        }
    }

    return [];
};

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
    // Cap at 500 chars, strip newlines, strip < and >
    content = content.substring(0, 500).replace(/[\r\n]+/g, ' ').replace(/[<>]/g, '');

    // Auto-extract course codes (e.g., "int 221", "CSE332", "174") from user query to strictly filter sources
    let currentFilters = filters || {};
    
    // Check for syllabus or notes request early to enforce category filter
    const isSyllabusRequest = /\b(syllabus|course\s*overview|course\s*outline|course\s*content|what\s*is\s*covered|topics\s*covered|course\s*structure)\b/i.test(content);
    const isNotesRequestEarly = /\b(notes|study\s*material|lecture\s*notes|explain|explanation)\b/i.test(content);
    const isGenericPyqRequestEarly = /\b(pyq|pyqs|previous year|past year|practice questions?|mid term|ete|etp|end term)\b/i.test(content);

    if (isSyllabusRequest) {
        currentFilters.category = 'syllabus';
    } else if (isNotesRequestEarly) {
        currentFilters.category = 'notes';
    } else if (isGenericPyqRequestEarly) {
        currentFilters.category = 'pyq';
    }

    const fullCourseMatch = content.match(/\b([a-zA-Z]{2,4})[-_\s]*(\d{3})\b/i);
    const numCourseMatch = content.match(/\b(\d{3})\b/);
    
    if (fullCourseMatch || numCourseMatch) {
        try {
            const courseCode = fullCourseMatch ? fullCourseMatch[1] : '';
            const courseNum = fullCourseMatch ? fullCourseMatch[2] : numCourseMatch[1];
            // Match with or without spaces/dashes (e.g. PHY 110, PHY110, PHY-110)
            const regexStr = courseCode ? `^${courseCode}[-_\\s]*${courseNum}$` : `^[A-Za-z]{2,4}[-_\\s]*${courseNum}$`;
            const regexMatch = new RegExp(regexStr, 'i');
            
            const uniqueSubjects = await Document.distinct('subject', { subject: regexMatch });
            if (uniqueSubjects.length > 0) {
                // If found in DB, use the exact string from the DB (e.g. "PHY110" or "INT-221")
                currentFilters.subject = uniqueSubjects[0];
            } else if (fullCourseMatch) {
                // Fallback to exactly what the user typed if not in DB yet
                currentFilters.subject = `${fullCourseMatch[1].toUpperCase()} ${fullCourseMatch[2]}`;
            } else if (numCourseMatch) {
                // Fallback to avoid searching all docs when a specific number was provided but DB lookup failed
                currentFilters.subject = `UNKNOWN ${numCourseMatch[1]}`;
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

        // 4.5. Manage Active Course Context (Sticky Context)
        let activeCourseUpdated = false;

        // If the user's current message explicitly mentioned a subject, update the conversation's active course
        if (currentFilters.subject && currentFilters.subject !== conversation.activeCourse) {
            conversation.activeCourse = currentFilters.subject;
            activeCourseUpdated = true;
        } 
        // Otherwise, if we didn't find one in the current message but have one saved, use the saved context
        else if (!currentFilters.subject && conversation.activeCourse) {
            currentFilters.subject = conversation.activeCourse;
        } 
        // Finally, if both are empty (e.g. an old conversation before this feature), fallback to history parsing
        else if (!currentFilters.subject && !conversation.activeCourse) {
            // Search from the most recent message backwards, ONLY looking at user messages
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].role !== 'user') continue;
                
                const histFullMatch = history[i].content.match(/\b([a-zA-Z]{2,4})[-_\s]*(\d{3})\b/i);
                const histNumMatch = history[i].content.match(/\b(\d{3})\b/);
                
                if (histFullMatch || histNumMatch) {
                    try {
                        const courseCode = histFullMatch ? histFullMatch[1] : '';
                        const courseNum = histFullMatch ? histFullMatch[2] : histNumMatch[1];
                        const regexStr = courseCode ? `^${courseCode}[-_\\s]*${courseNum}$` : `^[A-Za-z]{2,4}[-_\\s]*${courseNum}$`;
                        const regexMatch = new RegExp(regexStr, 'i');
                        
                        const uniqueSubjects = await Document.distinct('subject', { subject: regexMatch });
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

        if (activeCourseUpdated) {
            await conversation.save();
        }

        // ── 5. Early Query Classification ────────────────────────────────────
        // Determine query type BEFORE hitting Qdrant to avoid unnecessary DB calls.
        
        // Check for casual greeting FIRST — very short, no substance ("hi", "thanks", "ok")
        const isCasualChat = content.trim().split(/\s+/).length <= 8 &&
            /^(hi|hello|hey|thanks|thank\s*you|ok|okay|sure|yes|no|bye|good|great|nice|cool|got\s*it|understood|lol|haha|what['']?s\s*up|sup)/i.test(content.trim());

        // Policy keywords — any of these means this is a RAG query:
        const _isMidTermEarly   = !isSyllabusRequest && /\b(mid[\s-]?term|midterm|mock[\s-]?test|40\s*mcq)\b/i.test(content);
        const _isEteEarly       = !isSyllabusRequest && /\b(end[\s-]?term|ete|final[\s-]?exam|final[\s-]?paper|end[\s-]?sem|endsem)\b/i.test(content);
        const _isEtpEarly       = !isSyllabusRequest && /\b(etp|end[\s-]?term[\s-]?practical|practical[\s-]?exam|lab[\s-]?exam|viva)\b/i.test(content);
        const _isCaEarly        = !isSyllabusRequest && /\b(ca|class[\s-]?assessment|class[\s-]?test|unit[\s-]?test|ca[\s-]?\d|ca\d)\b/i.test(content);
        const _isNotesEarly     = !isSyllabusRequest && !_isMidTermEarly && !_isEteEarly && !_isEtpEarly && !_isCaEarly && /\b(notes|study\s*material|lecture\s*notes|explain|explanation)\b/i.test(content);
        const _isPyqEarly       = !isSyllabusRequest && !_isMidTermEarly && !_isEteEarly && !_isEtpEarly && !_isCaEarly && /\b(pyq|pyqs|previous year|past year|practice questions?)\b/i.test(content);
        const _hasCourseCode    = /\b([a-zA-Z]{2,4})[-_\s]*(\d{3})\b/i.test(content) || Boolean(currentFilters.subject);

        // Follow-up on already generated exam content (e.g. "solution of q3", "explain question 5")
        const _isFollowUpEarly  = content.length < 150 && history.length > 1 &&
            /\b(solution|solve|explain|answer|why|how|question\s*\d+|q\s*\d+|que\s*\d+)\b/i.test(content);

        // A query needs RAG if it touches any university / course-related topic, and is NOT a casual chat
        const isRagQuery = !isCasualChat && (isSyllabusRequest || _isMidTermEarly || _isEteEarly || _isEtpEarly ||
                           _isCaEarly || _isNotesEarly || _isPyqEarly || _hasCourseCode || _isFollowUpEarly);

        // General task — has substance but no university keywords (e.g. "write a sorting algorithm")
        // However, if we have an active subject context (_hasCourseCode), we treat it as RAG to stay on topic.
        const isGeneralTask = !isRagQuery && !isCasualChat;

        // Skip Qdrant entirely for non-RAG queries
        const skipRag = !isRagQuery;

        console.log(`[QueryClassifier] isRagQuery=${isRagQuery}, isCasualChat=${isCasualChat}, isGeneralTask=${isGeneralTask}`);

        // ── 5a. Perform Hybrid Search (RAG queries only) ──────────────────────
        // For notes requests, fetch more chunks (150) to cover large documents thoroughly
        const searchLimit = (currentFilters.category === 'notes') ? 150 : 40;
        let searchResults = [];

        if (!skipRag) {
            searchResults = await performHybridSearch(content, currentFilters, searchLimit);

            // Fallback: If strictly filtered by 'notes' or 'pyq' but got nothing, fall back to syllabus
            if ((!searchResults || searchResults.length === 0) && (currentFilters.category === 'notes' || currentFilters.category === 'pyq')) {
                console.log(`[ChatController] No ${currentFilters.category} found for ${currentFilters.subject}. Falling back to syllabus.`);
                currentFilters.category = 'syllabus';
                searchResults = await performHybridSearch(content, currentFilters);
            }
        }

        // Build context string from search results
        let contextText = "";
        const sourceData = [];
        if (searchResults && searchResults.length > 0) {
            // Sort chunks chronologically by document and chunk index so the AI reads in logical order
            searchResults.sort((a, b) => {
                if (a.documentId !== b.documentId) return a.documentId.localeCompare(b.documentId);
                return a.chunkIndex - b.chunkIndex;
            });

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
        const strictContextRule = skipRag ? "" : `
If the answer is not in the context, say "I don't have enough information in the provided documents to answer that definitively." but you can offer general knowledge if appropriate, making sure to clarify it's not from the course material.`;

        const systemPrompt = `You are Verto AI, an expert teaching assistant for university students. 
Answer the user's questions based primarily on the provided context from university documents.${strictContextRule}

Use markdown formatting to make your answers professional, highly structured, and easy to read:
- ALWAYS break down complex information into bullet points or numbered lists.
- Avoid long, dense paragraphs. Use bold text to highlight key terms.
- For step-by-step guides, use numbered lists.

=== Context from University Documents ===
${contextText ? contextText : "No relevant context found in the database."}

=== FINAL CRITICAL INSTRUCTIONS ===
1. RESPONSE MODE: By default, act like a normal conversational chatbot. If the user only types a course name or code (e.g., "INT 108" or "python"), give a brief 1-2 sentence description of the course and ask them what they need help with (e.g., "Would you like to see the syllabus, study notes, or practice questions?"). Do NOT dump the entire syllabus, notes, or generate questions unless they explicitly ask for them. Only trigger exam/notes/syllabus policies when their specific keywords are present.
2. SYLLABUS POLICY: When the user asks for a syllabus or course overview, follow these rules:
   - For a full syllabus request: Start with the course name and code. List EVERY single unit from the context (typically ALL 6 UNITS) with its unit number as a heading (e.g., "**Unit 1: [Title]**") followed by all key topics. Do NOT skip any units. Do NOT stop early.
   - Include credit hours, textbooks, and any other relevant info if available.
   - Do NOT generate questions during syllabus requests unless explicitly asked.
3. QUESTION GENERATION GUIDELINES: When generating any questions (practice, exams, mock tests):
   - Number every question using a Markdown Heading 3: "### Question 1:", "### Question 2:", etc.
   - **MCQ Formatting (CRITICAL)**: You MUST format the question and options so they render correctly on separate lines. ALWAYS insert a blank line (double newline) between the question text and Option A. NEVER output Option A on the same line as the question text. Every option (A, B, C, D) MUST start on its own separate line.
   - **Syllabus Scope (STRICT)**: EVERY question you generate or select MUST be strictly based on topics listed in the course syllabus provided in the context. Do NOT generate questions on topics that are outside the syllabus, even if they are related to the broader subject. Cross-reference each question against the syllabus unit topics before including it.
   - **PYQ Priority — Per Unit (STRICT)**: Questions MUST be evenly distributed across all specified units (±1-2 questions tolerance is acceptable, but large imbalances like 5 from Unit 1 and 25 from Unit 2 are strictly forbidden). For EACH unit, follow this exact process: STEP 1 — Extract as many real PYQs as possible that belong to that unit from the provided context. STEP 2 — If the PYQ count for that unit is less than the required quota, generate NEW questions of the same style, difficulty, and type as the PYQs to fill up the quota for that unit, taking extensive context from the provided Notes and Syllabus to ensure they are highly relevant. STEP 3 — Move on to the next unit and repeat. Never over-pull from one unit at the expense of another.
   - **Topic Coverage — Within Each Unit (CRITICAL)**: Within each unit, questions MUST be spread across ALL topics listed in the syllabus for that unit. BEFORE generating questions for a unit, list all the topics from the syllabus for that unit, then ensure AT LEAST 1 question covers each topic. If the quota allows, distribute the remaining questions proportionally. NEVER generate multiple questions from the same topic while another topic in the same unit has zero coverage. For example, if Unit 1 has 5 topics and you need 15 questions, that is 3 questions per topic — do NOT generate 10 questions on Scheduling and 0 on Memory Management.
   - **University-Level Rigor**: Assume the student is a university undergraduate or postgraduate. Do NOT generate trivial or high-school level questions. Problems must require multi-step reasoning, synthesis of multiple concepts, or advanced application.
   - **Cross-Unit Style Matching (CRITICAL)**: Always analyze the exact style, pattern, and nature of the questions in the provided PYQs (e.g., highly numerical, code-heavy implementation, circuit diagrams, practical case-studies, or derivation-heavy). If you need to invent questions for a unit that is NOT covered by the PYQs, you MUST ensure the newly invented questions perfectly mimic the exact rigor and style of the provided PYQs. For example, if the PYQs ask for working code, the new questions must ask for working code. If the PYQs are heavily numerical/physics derivations, the new questions must be numerical/derivations. Do NOT fall back to generic theoretical definitions unless the PYQs themselves are purely theoretical.
   - For computational/numerical subjects (like Maths, Physics, Accounting, Engineering), questions MUST be practical problem-solving, numerical calculations, or derivations. Do NOT generate simple definitional or theoretical questions (e.g., "Define a function") unless explicitly present in the PYQs. Force the student to solve real numerical problems.
   - For programming/computer science subjects (like INT, CSE, MVC, Java, Python), subjective questions MUST heavily feature practical implementation. Ask the student to write actual code snippets, build features, trace outputs, or debug issues. Do NOT generate basic theoretical definitions (e.g., "Describe MVC") unless heavily prominent in the PYQs.
   - **Realistic Scenarios**: Where possible, frame computational questions around real-world or industry-specific scenarios (e.g., data structures, engineering mechanics, business analytics) with specific, realistic data values.
4. PRACTICE QUESTIONS POLICY: If asked for practice questions, first use actual questions from the context. If you run out, INVENT highly relevant practice questions based on syllabus topics to match the style/difficulty of the real ones.
5. MID TERM POLICY (MANDATORY): Only apply when the user explicitly asks for mid term or mock test. Mid Terms cover ONLY Units 1, 2, and 3. Generate questions in one of these two formats based on what the user asks:
   - FORMAT A (MCQ): Output EXACTLY 40 MCQs. STRICT DISTRIBUTION: Unit 1 MUST have EXACTLY 13 questions, Unit 2 MUST have EXACTLY 13 questions, and Unit 3 MUST have EXACTLY 14 questions (13+13+14=40). YOU MUST STRICTLY ENFORCE THIS.
   - FORMAT B (Subjective): Output EXACTLY 15 subjective questions. STRICT DISTRIBUTION: Each of the 3 units MUST have EXACTLY 5 questions (5 x 3 = 15).
   CRITICAL RULE: If the user doesn't specify a format, you MUST ask them: "For this Mid Term, should I generate MCQ questions or Subjective questions?" Do not generate anything until they reply.
   UNIT DISTRIBUTION (MANDATORY): Process each unit individually. Every single generated question must be mapped directly under Unit 1, 2, or 3. DO NOT stop early.
6. END TERM EXAM (ETE) POLICY (MANDATORY): Only apply when the user explicitly asks for end term, ETE, or final exam questions. The ETE covers ALL 6 UNITS of the course. Generate questions in one of these three formats based on what the user asks:
   - FORMAT A (Full MCQ): Output EXACTLY 60 MCQs across all 6 units. STRICT DISTRIBUTION: Each of the 6 units MUST have EXACTLY 10 questions (10 x 6 = 60). YOU MUST STRICTLY ENFORCE THIS.
   - FORMAT B (Mixed): Output EXACTLY 30 MCQs (EXACTLY 5 per unit), AND THEN YOU MUST output subjective questions (2-mark, 5-mark, 10-mark) for all 6 units. DO NOT STOP AFTER THE MCQs.
   - FORMAT C (Subjective): Output exactly 7 long subjective questions (10-marks each) — 1 from each of Units 1-3, and 1-2 from each of Units 4-6.
   CRITICAL RULE: If the user does not explicitly state Format A, B, or C, YOU ARE STRICTLY FORBIDDEN from generating anything. You MUST ask them: "For this ETE, should I generate a full MCQ paper (60 questions), a mixed paper (30 MCQs + subjective), or a fully subjective paper (7 long questions)?"
   UNIT DISTRIBUTION (MANDATORY): Process each of the 6 units individually. YOU ARE STRICTLY FORBIDDEN FROM CREATING A "Unit 7" OR "Additional Questions" SECTION. Every single generated question must be mapped directly under Unit 1, 2, 3, 4, 5, or 6. DO NOT stop early. If generating Format A, you MUST generate exactly 10 questions per unit. If generating Format B, you MUST generate exactly 5 MCQs per unit AND the subjective questions.
7. END TERM PRACTICAL (ETP) POLICY (MANDATORY): Only apply when the user explicitly asks for end term practical, ETP, or practical exam questions. This exam tests hands-on implementation skills. Generate ONE comprehensive practical question (or a small set of 2-3 related questions) that:
   - Covers the MOST IMPORTANT practical topics spanning multiple units.
   - Describes a real-world problem or task the student must implement/solve.
   - Includes clear requirements, expected output/behavior, and any constraints.
   - May include sub-parts (a, b, c).
   SOURCE PRIORITY: FIRST PREFERENCE is to use actual PYQ practical questions. If none are available, create a realistic question matching the PYQ pattern by synthesizing the syllabus practical topics and course notes.
8. CLASS ASSESSMENT (CA) POLICY: Only apply when the user explicitly asks for CA, class test, class assessment, or unit test questions. Follow this EXACT flow:
   STEP 1 — If the user has NOT specified a course, ask: "Which course is this CA for? (e.g., CSE 332, MTH 174)"
   STEP 2 — If the user has NOT specified which units, ask: "Which units does this CA cover? (e.g., Unit 1 and 2)"
   STEP 3 — If the user has NOT specified the type, ask: "For this CA, should I generate MCQ questions or Subjective questions?"
   Only proceed to generate questions once you have all three pieces of information (course, units, type).
   - IF MCQ: Generate EXACTLY 30 MCQs strictly from the specified units. YOU MUST STRICTLY COUNT AND ENFORCE THESE EXACT QUOTAS: If 1 unit is specified, generate EXACTLY 30 questions for it. If 2 units are specified, generate EXACTLY 15 questions for EACH unit. If 3 units are specified, generate EXACTLY 10 questions for EACH unit. If 4 units are specified, generate EXACTLY 7 questions for the first two, and 8 for the last two. If 5 units are specified, generate EXACTLY 6 questions for EACH unit. YOU ARE STRICTLY FORBIDDEN from stopping early. You MUST reach exactly 30 questions.
   - IF SUBJECTIVE for CODING/PROGRAMMING subjects (INT, CSE, MVC, Java, Python, Web Dev, etc.): Generate EXACTLY 15 CODE IMPLEMENTATION questions, evenly split. Each question MUST ask the student to write actual working code. Do NOT ask definitions like "What is MVC?".
   - IF SUBJECTIVE for MATHS/PHYSICS/NUMERICAL subjects: Generate EXACTLY 15 numerical problem-solving questions, evenly split. Do NOT ask definitions.
   - IF SUBJECTIVE for OTHER subjects: Generate EXACTLY 15 questions (mix of short, medium, and long-answer), evenly split.
   UNIT DISTRIBUTION (MANDATORY for ALL FORMATS): Process each specified unit individually. You MUST map every question strictly to its unit and enforce exact numerical quotas per unit. Never pull extra from one unit to compensate for another. DO NOT stop early.
9. CODE RESPONSE POLICY: When the user asks coding questions, programming help, or anything involving code:
   - ALWAYS wrap code in fenced markdown code blocks with the correct language tag (e.g., \`\`\`python, \`\`\`java, \`\`\`c, \`\`\`javascript, \`\`\`sql, etc.).
   - Provide clear explanations before and after the code.
   - For multi-file or multi-step code, use separate code blocks for each file/step with descriptive headings.
   - Use inline code (\`like this\`) for variable names, function names, and short code references within text.
   - Include comments inside the code to explain key logic.
10. MATH FORMATTING: You MUST use LaTeX for math. Use $ for inline (e.g., $E = mc^2$) and $$ for block math. NEVER use \\[, \\], \\(, or \\) for math.
11. NOTES & EXPLANATION POLICY: When the user asks for notes, study material, or an explanation of a specific unit (e.g., "explain unit 1"):
   - FIRST PREFERENCE: Use the provided source notes context. The context contains chunks from the uploaded document — treat every chunk as valuable reference material.
   - COVERAGE (CRITICAL): You MUST cover EVERY topic and sub-topic present in the provided context. DO NOT summarize or skip any section. If the context mentions a topic (e.g., Memory Management Schemes, RAID, Deadlock, Semaphores), you MUST include detailed notes for that exact topic.
   - DEPTH: For each topic, explain all key concepts, definitions, types, algorithms, and examples as found in the source material. Do NOT give a 2-line generic summary when the source has pages of detail.
   - STRUCTURE: Use clear headings (## for main topics, ### for sub-topics), bullet points for lists, numbered steps for algorithms, and code blocks for code examples. For tables, NEVER put a table inside or next to a bulleted list. ALWAYS end the list, insert a blank line (double newline), and then start the markdown table on its own line.
   - SUBJECT-SPECIFIC RULES: For math/physics subjects include worked numerical examples; for coding subjects include functional code snippets with comments; for theory subjects include definitions, diagrams (described in text), and examples.
   - If notes are completely unavailable in the context, generate comprehensive notes using the syllabus context — but still cover every syllabus topic in detail.
   - DO NOT stop early. DO NOT end with "Conclusion" after only covering 3 topics when the syllabus/notes have 15 topics.
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
        // Re-use the early classification flags computed before the search
        let isMidTermRequest = _isMidTermEarly;
        let isEteRequest     = _isEteEarly;
        let isEtpRequest     = _isEtpEarly;
        let isCaRequest      = _isCaEarly;
        let isNotesRequest   = _isNotesEarly;
        let isGenericPyqRequest = _isPyqEarly;
        const isJustCourseCode  = content.trim().split(/\s+/).length <= 3 && /\b([a-zA-Z]{3})[-_\s]*(\d{3})\b/i.test(content);
        const isNoPolicyTriggered = skipRag; // same condition — no policy keyword detected

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
                if (!isPyqFollowUp) {
                    if (/\b(CA|Class Assessment)\b/i.test(lastAssistantMsg)) isCaRequest = true;
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

        // Detect follow-ups to previously generated CA/ETE/Mid-term questions
        // e.g. "give me solution of question 2", "explain question 5", "what's the answer to q3"
        const isFollowUpOnGeneratedContent = _isFollowUpEarly;

        if (isFollowUpOnGeneratedContent && !isCaRequest && !isEteRequest && !isMidTermRequest && !isEtpRequest && !isNotesRequest) {
            // Look backwards in history to detect what exam type was previously generated
            for (let i = history.length - 2; i >= 0; i--) {
                const msg = history[i];
                if (msg.role === 'assistant') {
                    if (/\b(class assessment|class test|unit test)\b/i.test(msg.content)) { isCaRequest = true; break; }
                    if (/\b(end[- ]?term exam|ETE|final exam)\b/i.test(msg.content)) { isEteRequest = true; break; }
                    if (/\b(mid[- ]?term|mock test)\b/i.test(msg.content)) { isMidTermRequest = true; break; }
                    if (/\b(practical|ETP|viva)\b/i.test(msg.content)) { isEtpRequest = true; break; }
                }
            }
        }

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
            if (isFollowUpOnGeneratedContent) {
                userQueryFinal = content + "\n\n[REMINDER: The user is asking a FOLLOW-UP question about a MID TERM paper that was already generated in this conversation. DO NOT re-generate the paper. DO NOT ask for any clarification. Simply provide the solution, explanation, or answer to the specific question the user is referring to. Use the conversation history above to identify the relevant question.]";
            } else {
                userQueryFinal = content + "\n\n[REMINDER: MID TERM request detected. Generate EXACTLY 40 MCQs from Units 1, 2 and 3 only. Number as '### Question 1:', '### Question 2:', etc. PYQ RULE: Extract ALL actual PYQ questions from the provided context FIRST — do NOT skip any available PYQs. Only after exhausting real PYQs, invent new questions matching their pattern. SCOPE RULE: Every question MUST be strictly based on topics listed in the syllabus for Units 1-3. Do NOT ask about topics outside the syllabus. STYLE RULE: Study the provided PYQ questions — if they are numerical/computational, ALL your generated questions MUST also be numerical/computational. If the PYQs contain code, your questions must contain code. NEVER generate generic theoretical 'What is X?' or 'Define Y' questions unless the PYQs themselves are purely theoretical. Do NOT stop early.]";
            }
        } else if (isEtpRequest) {
            userQueryFinal = content + "\n\n[REMINDER: END TERM PRACTICAL (ETP) request detected. Generate one comprehensive practical question. PYQ RULE: Use actual PYQ practical questions FIRST if available. SCOPE RULE: The question MUST be strictly based on practical topics listed in the syllabus. Do NOT test topics outside the syllabus. STYLE RULE: Study the provided PYQ questions — if they require writing code, your question must require writing code. If they require solving numerical problems, your question must require solving. NEVER generate generic theoretical questions.]"
        } else if (isEteRequest) {
            if (isFollowUpOnGeneratedContent) {
                userQueryFinal = content + "\n\n[REMINDER: The user is asking a FOLLOW-UP question about an END TERM EXAM (ETE) paper that was already generated in this conversation. DO NOT re-generate the paper. DO NOT ask for any clarification. Simply provide the solution, explanation, or answer to the specific question the user is referring to. Use the conversation history above to identify the relevant question.]";
            } else {
                userQueryFinal = content + "\n\n[REMINDER: END TERM EXAM (ETE) request detected. Cover ALL 6 UNITS. Ask format if unspecified ('For this ETE, should I generate a full MCQ paper (60 questions), a mixed paper (30 MCQs + subjective), or a fully subjective paper (7 long questions)?'). PYQ RULE: Extract ALL actual PYQ questions from the provided context FIRST — do NOT skip any available PYQs. Map them to their syllabus units. If PYQs only cover early units, distribute them there and invent new questions for the remaining units. SCOPE RULE: Every question MUST be strictly based on topics listed in the syllabus. Do NOT ask about topics outside the syllabus even if related to the subject. STYLE RULE (MANDATORY): Study the exact nature of the provided PYQ questions. If they are numerical, then EVERY invented question MUST ALSO be numerical — give actual numbers, formulas, and values to compute. If code-based, give code-based questions. NEVER fall back to generic 'What is X?' or 'Define Y' theoretical questions unless the PYQs themselves are purely theoretical.]";
            }
        } else if (isCaRequest) {
            const userSpecifiedType = /\b(mcq|subjective|objective|coding|numerical|implementation|multiple[\s-]?choice)\b/i.test(content);
            if (isFollowUpOnGeneratedContent) {
                // The user is asking for a solution/explanation of a previously generated CA question.
                // Do NOT re-ask clarification. Just answer from conversation history.
                userQueryFinal = content + "\n\n[REMINDER: The user is asking a FOLLOW-UP question about a CLASS ASSESSMENT (CA) that was already generated in this conversation. DO NOT ask for course, units, or question type again — that information is already in the conversation history. Simply provide the solution, explanation, or answer to the question the user is asking about. Use the conversation history above to identify the relevant question.]";
            } else if (userSpecifiedType) {
                userQueryFinal = content + "\n\n[REMINDER: CLASS ASSESSMENT (CA) request detected. The user has specified the question type. Generate questions NOW. PYQ RULE: Extract ALL actual PYQ questions from the provided context FIRST for the specified units — do NOT skip any available PYQs. Only after exhausting real PYQs, invent new questions matching their pattern. SCOPE RULE: Every question MUST be strictly based on topics listed in the syllabus for the specified units. Do NOT ask about topics outside the syllabus. STYLE RULE (MANDATORY): Study the exact nature of the provided PYQ questions. If they are numerical, then EVERY question you generate MUST ALSO be numerical — give actual numbers, formulas, and values to compute. If code-based, give code to write. NEVER fall back to generic 'What is X?' theoretical questions unless PYQs are purely theoretical. RULES BY SUBJECT TYPE: (1) For CODING subjects (INT, CSE, MVC, Java, Python): Subjective questions MUST be CODE IMPLEMENTATION — ask the student to WRITE working code. (2) For MATHS/PHYSICS: Subjective must be numerical problems with actual values. (3) For MCQs: Generate EXACTLY 30 MCQs. DO NOT stop early.]"
            } else {
                userQueryFinal = content + "\n\n[REMINDER: CLASS ASSESSMENT (CA) request detected. Check if the user has specified: (1) course, (2) units, and (3) question type. If ANY of these are missing, you MUST ask before generating. Specifically, if the question type is not specified, ask: 'For this CA, should I generate MCQ questions or Subjective questions?' CRITICAL: You are FORBIDDEN from generating any questions in this response. Your ONLY job right now is to ask the clarifying questions. Do NOT assume anything.]"
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

        // 8. Confidence-based LLM routing + batched question generation
        // ── 8a. Compute retrieval confidence and choose model ─────────────────
        const confidence = computeConfidence(searchResults);

        // Override confidence to 1.0 for queries that don't need OpenAI:
        //  - skipRag (casual chat / general tasks)  → no RAG was done, Free LLM handles it fine
        //  - isFollowUpOnGeneratedContent           → answered from history, not from retrieved docs
        const effectiveConfidence = (skipRag || isFollowUpOnGeneratedContent) ? 1.0 : confidence;

        const overrideReason = skipRag
            ? (isCasualChat ? ' [casual-chat]' : ' [general-task]')
            : isFollowUpOnGeneratedContent ? ' [follow-up override]' : '';

        const waterfallProviders = getProvidersWaterfall(effectiveConfidence);
        const primaryProvider = waterfallProviders[0];
        console.log(`[LLM Router] confidence=${confidence.toFixed(3)} (effective=${effectiveConfidence.toFixed(3)}), waterfall=${waterfallProviders.length} providers. Primary=${primaryProvider.providerName} (${primaryProvider.model})${overrideReason}`);

        // Send provider routing info to the client as an early SSE event
        res.write(`event: provider\ndata: ${JSON.stringify({
            providerName: primaryProvider.providerName,
            model: primaryProvider.model,
            confidence: parseFloat(confidence.toFixed(3)),
            effectiveConfidence: parseFloat(effectiveConfidence.toFixed(3)),
            waterfallCount: waterfallProviders.length,
            overrideReason: overrideReason.trim() || null,
        })}\n\n`);


        // ── 8b. Detect whether this request needs batched generation ──────────
        // Batching is used for large question sets (ETE 60Q, Mid-Term 40Q, CA 30Q)
        // to stay within per-call token output limits regardless of which model is chosen.
        let batchTaskType  = null;
        let caUnitsForBatch = [];

        if (!isFollowUpOnGeneratedContent) {
            // Gather all conversation text for indicator detection
            const allText = [content, ...history.map(h => h.content || '')].join(' ');
            const mcqIndicated = /\b(mcq|objective|multiple[\s-]?choice)\b/i.test(allText);

            if (isMidTermRequest && mcqIndicated) {
                // Mid-Term: always 40 MCQs across 3 units → batch
                batchTaskType = 'midterm_mcq';

            } else if (isEteRequest) {
                // ETE Format A (60 MCQs)
                const isFormatA = /\bformat\s*a\b|\bfull\s*mcq\b|\b60\s*(questions?|mcqs?)\b/i.test(allText);
                // ETE Format B (30 MCQs + subjective — batch only the MCQ part)
                const isFormatB = /\bformat\s*b\b|\bmixed\b/i.test(allText);
                if (isFormatA) batchTaskType = 'ete_mcq';
                else if (isFormatB) batchTaskType = 'ete_mixed_mcq';
                // Format C (7 subjective) → no batching needed (≤ 10)

            } else if (isCaRequest && mcqIndicated) {
                // CA MCQ: 30 questions, split by unit count
                batchTaskType  = 'ca_mcq';
                caUnitsForBatch = extractCaUnits(content, history);

            } else if (isCaRequest && /\b(subjective|coding|implementation|numerical)\b/i.test(allText)) {
                // CA Subjective: 15 questions — only batch when 3+ units (total ≥ 10/unit)
                caUnitsForBatch = extractCaUnits(content, history);
                if (caUnitsForBatch.length >= 2) {
                    batchTaskType = 'ca_subjective';
                }
            }
        }

        let fullAssistantResponse = '';

        if (batchTaskType) {
            // ── 8c. Batched path ─────────────────────────────────────────────
            console.log(`[LLM Router] Batched generation — type=${batchTaskType}, units=[${caUnitsForBatch}]`);

            try {
                fullAssistantResponse = await streamBatchedQuestions({
                    taskType:       batchTaskType,
                    caUnits:        caUnitsForBatch,
                    subject:        currentFilters.subject || '',
                    systemPrompt:   apiMessages[0].content,
                    userQueryFinal,
                    waterfallProviders, // pass the whole waterfall
                    onToken: (token) => {
                        res.write(`data: ${JSON.stringify({ token })}\n\n`);
                    },
                });
            } catch (batchErr) {
                console.error(`[LLM Router] All batch providers failed. Sending error...`, batchErr.message);
                throw batchErr;
            }

        } else {
            // ── 8d. Standard streaming path (with Waterfall) ─────────────────
            let streamSuccess = false;
            let currentProviderIdx = 0;
            let lastStreamErr = null;

            while (!streamSuccess && currentProviderIdx < waterfallProviders.length) {
                const { client: llmClient, model: llmModel, providerName, id } = waterfallProviders[currentProviderIdx];
                const isNonOpenAI = id !== 'openai';
                
                try {
                    const safeMaxTokens = id === 'openai' ? 16000 : 4000;
                    
                    const stream = await llmClient.chat.completions.create({
                        model:      llmModel,
                        messages:   apiMessages,
                        max_tokens: safeMaxTokens,
                        stream:     true,
                    });

                    // Only apply think filter for non-OpenAI models
                    const thinkFilter  = isNonOpenAI ? createThinkFilter() : null;

                    for await (const chunk of stream) {
                        let token = chunk.choices[0]?.delta?.content || '';
                        if (!token) continue;

                        if (thinkFilter) {
                            token = thinkFilter(token);
                        }

                        if (token) {
                            fullAssistantResponse += token;
                            res.write(`data: ${JSON.stringify({ token })}\n\n`);
                        }
                    }

                    streamSuccess = true;
                    // Notify client which provider was actually used (may differ from primary if fallback occurred)
                    const usedProvider = waterfallProviders[currentProviderIdx];
                    res.write(`event: provider_used\ndata: ${JSON.stringify({ providerName: usedProvider.providerName, model: usedProvider.model, fallback: currentProviderIdx > 0 })}\n\n`);
                } catch (err) {
                    console.warn(`[LLM Router] ${providerName} stream failed: ${err.message}. Retrying...`);
                    markProviderFailure(id); // Place on cooldown so other requests don't wait for this timeout
                    lastStreamErr = err;
                    currentProviderIdx++; // Move to next provider
                }
            }

            if (!streamSuccess) {
                console.error(`[LLM Router] All waterfall providers failed!`);
                throw lastStreamErr;
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
        res.write(`data: [DONE]\n\n`);
        res.end();

    } catch (error) {
        console.error('Error in sendMessage:', error?.message || error);
        console.error('Error stack:', error?.stack);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server error processing message' });
        } else {
            // Headers already sent — write a plain data error so the frontend catches it
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
