'use strict';

const { StateGraph, START, END } = require('@langchain/langgraph');
const { AgentStateAnnotation } = require('./agentState');
const { performHybridSearch } = require('../services/search.service');
const { streamLLM, callLLMJson } = require('./llmAdapter');

// ── Nodes ──────────────────────────────────────────────────────────────────

async function syllabusChecklistNode(state) {
    if (state.onStep) {
        state.onStep({
            step: 'checklist',
            label: 'Extracting Syllabus Checklist',
            icon: 'syllabus',
            description: `Mapping official syllabus topics for ${state.subject || 'course'}`
        });
    }

    let syllabusChunks = [];
    if (state.subject) {
        try {
            const results = await performHybridSearch(`syllabus outline for ${state.subject}`, { category: 'syllabus', subject: state.subject }, 25);
            syllabusChunks = results || [];
        } catch (e) {
            console.warn('[NotesAgent] Syllabus search error:', e.message);
        }
    }

    return { syllabusChunks };
}

async function notesMiningNode(state) {
    if (state.onStep) {
        state.onStep({
            step: 'mining_notes',
            label: 'Mining Uploaded Notes & Technical Points',
            icon: 'notes',
            description: 'Extracting teacher algorithms, code snippets, and definitions'
        });
    }

    let notesChunks = [];
    if (state.subject) {
        const filters = { category: 'notes', subject: state.subject };
        if (state.units && state.units.length > 0) {
            filters.units = state.units;
        }

        try {
            const results = await performHybridSearch(state.userMessage, filters, 40);
            notesChunks = results || [];
        } catch (e) {
            console.warn('[NotesAgent] Notes search error:', e.message);
        }

        // If unit-specific search yielded few results, broaden search
        if (notesChunks.length < 5) {
            try {
                const broad = await performHybridSearch(state.userMessage, { category: 'notes', subject: state.subject }, 40);
                notesChunks = broad || [];
            } catch (e) {
                console.warn('[NotesAgent] Broad notes search error:', e.message);
            }
        }
    }

    return { notesChunks };
}

async function progressiveNotesGeneratorNode(state) {
    if (!state.subject) {
        const noSubjectMsg = "Please specify which course or subject code you need study notes for (e.g. MTH 174, CSE 332, INT 402).";
        if (state.onToken) state.onToken(noSubjectMsg);
        return { generatedContent: noSubjectMsg };
    }

    const syllabusChunks = state.syllabusChunks || [];
    const notesChunks = state.notesChunks || [];

    // Zero-document check: if no notes and no syllabus chunks found in archive
    if (syllabusChunks.length === 0 && notesChunks.length === 0) {
        const notEnoughMsg = `### ⚠️ Not Enough Information in Archive\n\nWe don't have uploaded lecture notes or syllabus documents for **${state.subject}** in the Vertos Archive yet.\n\nTo ensure academic rigor and avoid generating unverified or hallucinated material, notes generation is paused.\n\n**How to get notes for this course:**\n- Upload teacher notes, PPTs, or the syllabus for **${state.subject}** via the **Contribute** tab.\n- Once uploaded, our AI will index the material to generate complete topic-wise notes, formulas, and revision kits!`;
        if (state.onToken) state.onToken(notEnoughMsg);
        return { generatedContent: notEnoughMsg };
    }

    if (state.onStep) {
        state.onStep({
            step: 'deep_expansion',
            label: 'Synthesizing In-Depth Technical Notes',
            icon: 'generator',
            description: 'Writing comprehensive textbook-grade notes covering all syllabus points'
        });
    }

    const syllabusText = syllabusChunks.slice(0, 15).map(c => c.text).join('\n---\n');
    const notesText = notesChunks.slice(0, 30).map(c => c.text).join('\n---\n');

    const systemPrompt = `
You are a Senior Academic Professor for Lovely Professional University.
Generate exhaustive, beautifully structured textbook-grade study notes for ${state.subject}.
Do NOT mention internal architecture, agents, or pipeline nodes.

TARGET SCOPE:
- Units requested: ${state.units && state.units.length > 0 ? state.units.join(', ') : 'All relevant units'}
- User query: "${state.userMessage}"

STRUCTURE & FORMATTING POLICIES (MANDATORY):
Follow this exact visual layout for every major topic:

# 📝 Comprehensive Study Notes: ${state.subject}

> **Course:** ${state.subject} | **Coverage:** ${state.units && state.units.length > 0 ? 'Units ' + state.units.join(', ') : 'Syllabus Core'} | **Target:** University Exam & Practical Mastery

---

For EACH unit requested:

## Unit [X]: [Unit Title]

### [1.0] [Major Concept / Topic Name]

#### 📌 Theoretical Foundations & Architecture
- **Formal Definition:** [Rigorous academic definition]
- **Core Principles & Working Mechanism:**
  - **[Component/Aspect A]:** [In-depth technical explanation]
  - **[Component/Aspect B]:** [In-depth technical explanation]

#### 📐 Mathematical Formulations & Equations (if applicable)
$$
[Full LaTeX display equation]
$$
*Where:*
- $variable$ = [Definition and units]

#### 💻 Code Implementation & Algorithms (if coding/CSE/IT subject)
\`\`\`[language]
// Clean, runnable, well-commented code snippet
\`\`\`

#### 🔍 Worked Numerical Problem / Practical Case Study
- **Problem:** [Clear problem statement with specific values]
- **Step-by-Step Solution:**
  1. **Step 1:** ...
  2. **Step 2:** ...
- **Key Takeaway:** ...

#### ⚠️ Professor's Exam Callout & Trap Warnings
> **Exam Pitfall:** [Crucial edge case, common misconception, or typical university exam trap]

---

[Proceed through all syllabus sub-topics with identical rigor and structure. NEVER give a 2-line summary.]
`;

    const userPrompt = `Generate comprehensive, highly detailed notes covering all points from the uploaded notes and syllabus for ${state.subject}.

=== Official Syllabus Context ===
${syllabusText || 'No official syllabus document found; using uploaded lecture notes.'}

=== Uploaded Notes Context ===
${notesText || 'No uploaded lecture notes found; expanding based on official syllabus topics.'}
`;

    let generatedContent = '';
    await streamLLM({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.35,
        confidence: 0.85,
        onToken: (token) => {
            generatedContent += token;
            if (state.onToken) state.onToken(token);
        },
        onProvider: state.onProvider
    });

    return { generatedContent };
}

async function notesRevisionKitNode(state) {
    // If subject was missing or there was not enough info in archive, skip revision kit
    if (!state.subject || !state.generatedContent || state.generatedContent.includes('Not Enough Information in Archive') || state.generatedContent.includes('Please specify which course')) {
        return { generatedContent: state.generatedContent || '' };
    }

    if (state.onStep) {
        state.onStep({
            step: 'revision_kit',
            label: 'Compiling Quick-Revision Kit & Formulas',
            icon: 'explainability',
            description: 'Adding key equations, syntax table, and exam tips'
        });
    }

    const kitHeader = `\n\n---\n## 📑 Quick-Revision Cheat Sheet & Exam Callouts\n`;
    const prompt = `
Based on the notes just generated for ${state.subject || 'this course'}, produce a concise Quick-Revision Kit:

1. A clean Markdown table summarizing core formulas, syntax, or key concepts:
| Concept / Topic | Key Formula / Syntax / Rule | High-Yield Exam Takeaway |
| :--- | :--- | :--- |
| ... | ... | ... |

2. "Top 3 Common Exam Mistakes":
> 1. **Mistake 1:** [Pitfall description and how to solve correctly]
> 2. **Mistake 2:** [Pitfall description and how to solve correctly]
> 3. **Mistake 3:** [Pitfall description and how to solve correctly]

Output only this section in Markdown.
`;

    let revisionText = kitHeader;
    if (state.onToken) state.onToken(kitHeader);

    await streamLLM({
        messages: [
            { role: 'system', content: 'You are an academic exam coach. Provide a concise, high-yield revision cheat sheet.' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        confidence: 0.85,
        onToken: (token) => {
            revisionText += token;
            if (state.onToken) state.onToken(token);
        }
    });

    return {
        generatedContent: (state.generatedContent || '') + revisionText,
    };
}

// ── State Graph Definition ──────────────────────────────────────────────────

function buildNotesAgentGraph() {
    const workflow = new StateGraph(AgentStateAnnotation)
        .addNode('syllabusChecklist', syllabusChecklistNode)
        .addNode('notesMining', notesMiningNode)
        .addNode('progressiveNotesGenerator', progressiveNotesGeneratorNode)
        .addNode('notesRevisionKit', notesRevisionKitNode)
        
        .addEdge(START, 'syllabusChecklist')
        .addEdge('syllabusChecklist', 'notesMining')
        .addEdge('notesMining', 'progressiveNotesGenerator')
        .addEdge('progressiveNotesGenerator', 'notesRevisionKit')
        .addEdge('notesRevisionKit', END);

    return workflow.compile();
}

const notesAgentGraph = buildNotesAgentGraph();

module.exports = {
    notesAgentGraph,
};
