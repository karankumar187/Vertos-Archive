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
    const fullCourseMatch = content.match(/\b([a-zA-Z]{3})\s*(\d{3})\b/i);
    const numCourseMatch = content.match(/\b(\d{3})\b/);
    
    if (fullCourseMatch) {
        currentFilters.subject = `${fullCourseMatch[1].toUpperCase()} ${fullCourseMatch[2]}`;
    } else if (numCourseMatch) {
        try {
            const courseNum = numCourseMatch[1];
            const regexMatch = new RegExp(`^[A-Za-z]{3}\\s*${courseNum}$`, 'i');
            const uniqueSubjects = await Document.distinct('subject', { subject: regexMatch });
            if (uniqueSubjects.length === 1) {
                currentFilters.subject = uniqueSubjects[0].toUpperCase();
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

        // 4. Perform Hybrid Search to get context
        // Search across vector DB and MongoDB text index
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

        // 5. Fetch conversation history (last 10 messages to save context window)
        const history = await Message.find({ conversationId })
            .sort({ createdAt: -1 })
            .limit(11) // includes the one we just saved
            .lean();
        history.reverse();

        // 6. Construct OpenAI Messages Array
        const systemPrompt = `You are Verto AI, an expert teaching assistant for university students. 
Answer the user's questions based primarily on the provided context from university documents.
If the answer is not in the context, say "I don't have enough information in the provided documents to answer that definitively." but you can offer general knowledge if appropriate, making sure to clarify it's not from the course material.
Use markdown formatting (bold, italics, code blocks, lists) to make your answers easy to read.
If the user asks for a complete list (e.g., "all questions", "list all"), do not summarize or truncate; provide the exhaustive list from the context.

=== Context from University Documents ===
${contextText ? contextText : "No relevant context found in the database."}`;

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

        // Add the current user query
        apiMessages.push({ role: 'user', content });

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
