'use strict';

const { callLLMJson } = require('./llmAdapter');
const Document = require('../models/Document');

/**
 * Orchestrator Agent
 * Classifies intent and extracts parameters (course, units, exam type, format).
 * Also resolves course codes using database lookups.
 */
async function classifyIntent({ userMessage, history = [], currentCourseContext = null }) {
    // 1. Extract course code candidate from userMessage, then activeCourse, then history
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

    // If still no subject detected, scan recent conversation history (newest to oldest)
    let inheritedExamType = null;
    let inheritedUnits = [];

    if (Array.isArray(history) && history.length > 0) {
        for (let i = history.length - 1; i >= 0; i--) {
            const msgText = history[i].content || '';
            const lowerText = msgText.toLowerCase();

            // Detect subject if not found yet
            if (!detectedSubject) {
                const hMatch = msgText.match(/\b([a-zA-Z]{2,4})[-_\s]*(\d{3})\b/i);
                if (hMatch) {
                    try {
                        const regexStr = `^${hMatch[1]}[-_\\s]*${hMatch[2]}$`;
                        const uniqueSubjects = await Document.distinct('subject', { subject: new RegExp(regexStr, 'i') });
                        detectedSubject = uniqueSubjects.length > 0 ? uniqueSubjects[0] : `${hMatch[1].toUpperCase()} ${hMatch[2]}`;
                    } catch (e) {
                        detectedSubject = `${hMatch[1].toUpperCase()} ${hMatch[2]}`;
                    }
                }
            }

            // Inherit examType if recent user turn had it
            if (!inheritedExamType) {
                if (/\b(ca|class[\s-]?assessment)\b/i.test(lowerText)) inheritedExamType = 'ca';
                else if (/\b(midterm|mid[\s-]?term|mte)\b/i.test(lowerText)) inheritedExamType = 'midterm';
                else if (/\b(ete|end[\s-]?term|endterm)\b/i.test(lowerText)) inheritedExamType = 'ete';
                else if (/\b(etp|practical)\b/i.test(lowerText)) inheritedExamType = 'etp';
            }

            // Inherit units if recent user turn had it
            if (inheritedUnits.length === 0) {
                const uMatch = lowerText.match(/\bunit[s]?\s*([0-6](?:\s*(?:,|and|to|-)\s*[0-6])*)/i);
                if (uMatch) {
                    const nums = uMatch[1].match(/[0-6]/g);
                    if (nums) inheritedUnits = [...new Set(nums.map(Number))];
                }
            }
        }
    }

    // Explicit format detection (never guess between MCQ and Subjective)
    const hasExplicitMcq = /\b(mcq|mcqs|objective|multiple\s*choice)\b/i.test(userMessage);
    const hasExplicitSubjective = /\b(subjective|theory|descriptive|long\s*answer|short\s*answer)\b/i.test(userMessage);
    let explicitFormat = null;
    if (hasExplicitMcq) explicitFormat = 'mcq';
    else if (hasExplicitSubjective) explicitFormat = 'subjective';

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
  "format": "mcq" | "subjective" | null,
  "needsClarification": boolean,
  "clarificationQuestion": string | null
}

Rules:
- "units": Array of integers between 0 and 6. For Mid-Term, default to [1, 2, 3] if unspecified. For ETE, default to [1, 2, 3, 4, 5, 6]. For CA, extract specific units mentioned (e.g. "Unit 1 and 2" -> [1, 2]); if none mentioned for CA, leave empty [].
- "format": null if unspecified.
- CRITICAL: If intent is "exam", "notes", or "syllabus", and NO course code is present in the message or known hint, you MUST set "needsClarification": true, "subject": null, and provide a polite "clarificationQuestion" asking which course code (e.g. MTH 174, CSE 332, INT 402) they need.
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

        // Inherit examType & units from recent history if user is replying to a clarification
        if (!result.examType && inheritedExamType) {
            result.examType = inheritedExamType;
        }
        if (result.units.length === 0 && inheritedUnits.length > 0) {
            result.units = inheritedUnits;
        }

        // Apply explicit format override if detected directly from keywords
        if (explicitFormat) {
            result.format = explicitFormat;
        }

        // ── STRICT REQUIREMENT GATHERING FOR ALL ACADEMIC INTENTS ────────────
        // Never generate exam questions, notes, or syllabus without knowing the Course Code!
        const course = result.subject || detectedSubject;

        if (['exam', 'notes', 'syllabus'].includes(result.intent)) {
            // 1. Missing Course Code:
            if (!course) {
                result.needsClarification = true;
                if (result.intent === 'notes') {
                    result.clarificationQuestion = "Which course or subject code do you need study notes for? (e.g. MTH 174, CSE 332, INT 402)";
                } else if (result.intent === 'syllabus') {
                    result.clarificationQuestion = "Which course or subject code would you like the syllabus for? (e.g. MTH 174, CSE 332, INT 402)";
                } else {
                    result.clarificationQuestion = "Which course or subject code is this exam practice for? (e.g. MTH 174, CSE 332, INT 402)";
                }
                return result;
            }
            result.subject = course;
        }

        // Exam-specific strict checks (format & units)
        if (result.intent === 'exam') {
            // 2. Missing Question Format (MCQ vs Subjective):
            if (!result.format && !explicitFormat) {
                result.needsClarification = true;
                const unitText = result.units && result.units.length > 0 ? ` for Unit ${result.units.join(', ')}` : '';
                result.clarificationQuestion = `To generate the right questions for **${course}**${unitText}, would you like:\n\n1. **Multiple Choice Questions (MCQ)**\n2. **Subjective / Theory Questions**\n\nPlease let me know your preferred format!`;
                return result;
            }

            // 3. Missing Units for CA:
            if (result.examType === 'ca' && (!result.units || result.units.length === 0)) {
                result.needsClarification = true;
                result.clarificationQuestion = `Which specific unit(s) should this Continuous Assessment (CA) cover for **${course}**? (e.g. Unit 1, Unit 2, or Units 1 & 2)`;
                return result;
            }
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

        const fallbackSubject = detectedSubject;

        // Strict fallback clarification
        if (['exam', 'notes', 'syllabus'].includes(intent)) {
            if (!fallbackSubject) {
                let question = "Which course or subject code are you looking for? (e.g. MTH 174, CSE 332, INT 402)";
                if (intent === 'notes') question = "Which course or subject code do you need study notes for? (e.g. MTH 174, CSE 332, INT 402)";
                else if (intent === 'syllabus') question = "Which course or subject code would you like the syllabus for? (e.g. MTH 174, CSE 332, INT 402)";
                return {
                    intent,
                    subject: null,
                    examType: /\bca\b/i.test(userMessage) ? 'ca' : (/\bmid\b/i.test(userMessage) ? 'midterm' : 'ete'),
                    units: [],
                    format: explicitFormat || null,
                    needsClarification: true,
                    clarificationQuestion: question
                };
            }

            if (intent === 'exam' && !explicitFormat) {
                return {
                    intent,
                    subject: fallbackSubject,
                    examType: /\bca\b/i.test(userMessage) ? 'ca' : (/\bmid\b/i.test(userMessage) ? 'midterm' : 'ete'),
                    units: [],
                    format: null,
                    needsClarification: true,
                    clarificationQuestion: `Would you like **Multiple Choice Questions (MCQ)** or **Subjective / Theory Questions** for **${fallbackSubject}**?`
                };
            }
        }

        return {
            intent,
            subject: fallbackSubject,
            examType: /\bca\b/i.test(userMessage) ? 'ca' : (/\bmid\b/i.test(userMessage) ? 'midterm' : 'ete'),
            units: [],
            format: explicitFormat || 'mcq',
            needsClarification: false,
            clarificationQuestion: null,
        };
    }
}

module.exports = {
    classifyIntent,
};
