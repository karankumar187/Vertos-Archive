'use strict';

const { StateGraph, START, END } = require('@langchain/langgraph');
const { AgentStateAnnotation } = require('./agentState');
const { performHybridSearch } = require('../services/search.service');
const { streamLLM } = require('./llmAdapter');

async function retrieveSyllabusNode(state) {
    if (state.onStep) {
        state.onStep({
            step: 'retrieving_syllabus',
            label: 'Retrieving Official Course Syllabus',
            icon: 'syllabus',
            description: `Searching archives for official curriculum of ${state.subject || 'course'}`
        });
    }

    let syllabusChunks = [];
    if (state.subject) {
        try {
            const results = await performHybridSearch(`syllabus curriculum for ${state.subject}`, { category: 'syllabus', subject: state.subject }, 30);
            syllabusChunks = results || [];
        } catch (e) {
            console.warn('[SyllabusAgent] Search error:', e.message);
        }
    }

    return { syllabusChunks };
}

async function formatSyllabusNode(state) {
    if (!state.subject) {
        const noSubjectMsg = "Which course or subject code would you like the syllabus for? (e.g. MTH 174, CSE 332, INT 402)";
        if (state.onToken) state.onToken(noSubjectMsg);
        return { generatedContent: noSubjectMsg };
    }

    const syllabusChunks = state.syllabusChunks || [];
    if (syllabusChunks.length === 0) {
        const notEnoughMsg = `### ⚠️ Not Enough Information in Archive\n\nWe don't have the official syllabus document for **${state.subject}** in the Vertos Archive yet.\n\nTo ensure complete curriculum accuracy and avoid unverified topic outlines, please upload the official course syllabus or curriculum document for **${state.subject}** via the **Contribute** tab.\n\nOnce uploaded, I will index the official 6 units, lecture breakdown, and prescribed textbooks!`;
        if (state.onToken) state.onToken(notEnoughMsg);
        return { generatedContent: notEnoughMsg };
    }

    if (state.onStep) {
        state.onStep({
            step: 'structuring_blueprint',
            label: 'Structuring 6-Unit Course Blueprint',
            icon: 'alignment',
            description: 'Extracting unit titles, credit breakdown, and recommended textbooks'
        });
    }

    const syllabusText = syllabusChunks.map(c => c.text).join('\n---\n');

    const systemPrompt = `
You are an expert Senior Academic Dean for Lovely Professional University.
Format an official, beautifully structured course curriculum document for ${state.subject}.
Do not mention internal architecture, agents, or pipeline nodes.
Ground all topics strictly on the uploaded syllabus archive text below.

STRUCTURE & FORMATTING SPECIFICATION (MANDATORY):
Follow this exact Markdown hierarchy and layout with dividers and tables:

# 📚 Course Curriculum: ${state.subject}

> **Course Code:** ${state.subject} | **Credit Weightage:** [Credits from archive, e.g. 4 Credits (L-T-P: 3-1-0)] | **Department:** [Department/School]

---

## 🎯 Course Overview & Objectives
[A concise, professional 2-3 sentence overview describing the aim of this course and core learning outcomes based on the syllabus.]

---

## 📑 6-Unit Curriculum Blueprint

For EACH unit (Unit 1 through Unit 6), follow this clean format:

### Unit 1: [Unit Title]
- **Core Topics:** [High-level topic list]
- **Detailed Syllabus Topics:**
  - [Sub-topic 1: key mechanisms, concepts]
  - [Sub-topic 2: key mechanisms, concepts]
  - [Sub-topic 3: key mechanisms, concepts]
- **Practical / Laboratory Scope (if applicable):** [Lab topics or implementations]

[Repeat identical clean structure for Unit 2, Unit 3, Unit 4, Unit 5, and Unit 6. NEVER skip or merge units.]

---

## 📖 Recommended Textbooks & Reference Materials
Format as a clean Markdown table:
| Category | Book Title & Author | Edition / Publisher |
| :--- | :--- | :--- |
| **Prescribed Textbook** | [Book title] by [Author] | [Edition / Publisher] |
| **Reference Book** | [Book title] by [Author] | [Edition / Publisher] |

---

## ⚖️ Official Examination & Evaluation Scheme
Format as a clean Markdown table:
| Evaluation Component | Weightage | Units Covered | Testing Format |
| :--- | :--- | :--- | :--- |
| **Continuous Assessment (CA)** | 30% | Units 1–2 / Periodic | Class Tests, MCQs, Homework & Quizzes |
| **Mid-Term Exam (MTE)** | 20% | Units 1, 2 & 3 | 40 MCQs or 15 Subjective Questions |
| **End-Term Exam (ETE)** | 50% | All Units (1 to 6) | Comprehensive University Exam Paper |

--- Syllabus Archive ---
${syllabusText}
`;

    let generatedContent = '';
    await streamLLM({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Provide the complete, official syllabus blueprint for ${state.subject} based strictly on the uploaded syllabus archive, covering all 6 units, textbooks table, and exam scheme.` }
        ],
        temperature: 0.2,
        confidence: 0.9,
        onToken: (token) => {
            generatedContent += token;
            if (state.onToken) state.onToken(token);
        },
        onProvider: state.onProvider
    });

    return { generatedContent };
}

function buildSyllabusAgentGraph() {
    const workflow = new StateGraph(AgentStateAnnotation)
        .addNode('retrieveSyllabus', retrieveSyllabusNode)
        .addNode('formatSyllabus', formatSyllabusNode)
        .addEdge(START, 'retrieveSyllabus')
        .addEdge('retrieveSyllabus', 'formatSyllabus')
        .addEdge('formatSyllabus', END);

    return workflow.compile();
}

const syllabusAgentGraph = buildSyllabusAgentGraph();

module.exports = {
    syllabusAgentGraph,
};
