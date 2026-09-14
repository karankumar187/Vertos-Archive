'use strict';

const { callLLMJson } = require('./llmAdapter');
const Document = require('../models/Document');

/**
 * Orchestrator Agent
 * Classifies intent and extracts parameters (course, units, exam type, format).
 * Also resolves course codes using database lookups.
 */
async function classifyIntent({ userMessage, history = [], currentCourseContext = null }) {
    // 1. First extract course code candidate from text if present
    let detectedSubject = currentCourseContext || null;
    const fullCourseMatch = userMessage.match(/\b([a-zA-Z]{2,4})[-_\s]*(\d{3})\b/i);
    const numCourseMatch = userMessage.match(/\b(\d{3})\b/);

    if (fullCourseMatch || numCourseMatch) {
        try {
            const courseCode = fullCourseMatch ? fullCourseMatch[1] : '';
            const courseNum = fullCourseMatch ? fullCourseMatch[2] : numCourseMatch[1];
            const regexStr = courseCode ? `^${courseCode}[-_\\s]*${courseNum}$` : `^[A-Za-z]{2,4}[-_\\s]*${courseNum}$`;
            const uniqueSubjects = await Document.distinct('subject', { subject: new RegExp(regexStr, 'i') });

            if (uniqueSubjects.length > 0) {
                detectedSubject = uniqueSubjects[0];
            } else if (fullCourseMatch) {
                detectedSubject = `${fullCourseMatch[1].toUpperCase()} ${fullCourseMatch[2]}`;
            }
        } catch (e) {
            console.warn('[Orchestrator] Course code lookup warning:', e.message);
        }
    }

    // 2. Structured LLM Classification
    const prompt = `
You are the central Orchestrator for "Verto AI", a university academic assistant.
Analyze the user's latest message (and conversation context) to classify intent and extract parameters.

Categories:
1. "exam": Requesting mock test, practice questions, PYQs, MCQs, or subjective questions for an exam (CA, Mid Term, ETE, ETP).
2. "notes": Requesting study material, comprehensive notes, chapter explanations, or conceptual deep-dives for a course.
3. "syllabus": Requesting course syllabus, outline, textbook list, or topic breakdown.
4. "tutor": Asking to solve a specific question, explain a particular problem/option, or step-by-step math/code help.
5. "casual": General or normal chat, greetings ("hi", "hello"), identity questions ("who are you", "what can you do", "help me"), general college/life advice, jokes, or any message not specifically asking to generate course exam questions, notes, or syllabus.

Known course code hint: ${detectedSubject || 'None yet'}

Input message: "${userMessage}"

Respond strictly with a JSON object matching this schema:
{
  "intent": "exam" | "notes" | "syllabus" | "tutor" | "casual",
  "subject": string | null,
  "examType": "ca" | "midterm" | "ete" | "etp" | null,
  "units": number[],
  "format": "mcq" | "subjective" | "mixed",
  "needsClarification": boolean,
  "clarificationQuestion": string | null
}

Rules:
- "units": Array of integers between 0 and 6. For Mid-Term, default to [1, 2, 3] if unspecified. For ETE, default to [1, 2, 3, 4, 5, 6]. For CA, extract specific units mentioned (e.g. "Unit 1 and 2" -> [1, 2]); if none mentioned for CA, leave empty [].
- If user requests exam questions for CA but mentions no units and no syllabus topic, set needsClarification: true and ask politely which unit(s) their CA covers.
- "format": Default to "mcq" unless user explicitly asks for subjective / theory questions.
`;

    try {
        const result = await callLLMJson({
            messages: [
                { role: 'system', content: 'You are an accurate intent classifier and entity extractor. Output valid JSON only.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            confidence: 0.9,
        });

        // Use DB-resolved subject if the LLM subject is null or generic
        if (!result.subject && detectedSubject) {
            result.subject = detectedSubject;
        }

        // Clean units array: ensure integers 0-6
        if (Array.isArray(result.units)) {
            result.units = result.units
                .map(Number)
                .filter(u => !isNaN(u) && u >= 0 && u <= 6);
        } else {
            result.units = [];
        }

        return result;
    } catch (err) {
        console.error('[Orchestrator] Intent classification failed, falling back to heuristics:', err.message);
        
        // Safe heuristic fallback if all LLM calls timed out
        const isExam = /\b(ca|mid term|midterm|ete|etp|pyq|mcq|practice questions?)\b/i.test(userMessage);
        const isNotes = /\b(notes|study material|explain in detail)\b/i.test(userMessage);
        const isSyllabus = /\b(syllabus|course outline)\b/i.test(userMessage);
        
        let intent = 'casual';
        if (isExam) intent = 'exam';
        else if (isNotes) intent = 'notes';
        else if (isSyllabus) intent = 'syllabus';

        return {
            intent,
            subject: detectedSubject,
            examType: /\bca\b/i.test(userMessage) ? 'ca' : (/\bmid\b/i.test(userMessage) ? 'midterm' : 'ete'),
            units: [],
            format: /\bsubjective\b/i.test(userMessage) ? 'subjective' : 'mcq',
            needsClarification: false,
            clarificationQuestion: null,
        };
    }
}

module.exports = {
    classifyIntent,
};
