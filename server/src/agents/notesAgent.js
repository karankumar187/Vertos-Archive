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
You are an Academic Professor for Lovely Professional University.
Generate exhaustive, textbook-grade study notes for ${state.subject}.
Do NOT mention internal architecture, agents, or pipeline nodes.

TARGET SCOPE:
- Units requested: ${state.units && state.units.length > 0 ? state.units.join(', ') : 'All relevant units'}
- User query: "${state.userMessage}"

STRICT ANTI-SUMMARY MANDATE (CRITICAL):
1. Under NO circumstances should you provide a brief, 2-line summary. Students need full, rigorous study material.
2. Ground your explanations strictly on the provided syllabus and uploaded notes context.
3. Every section MUST include:
   - **Theoretical Foundation**: Full, rigorous definitions and underlying mechanisms.
   - **Formulas & Math**: Every equation written in LaTeX ($...$ or $$...$$) with variable definitions.
   - **Code / Syntax Blocks**: If applicable (CSE, IT, Programming), provide complete, well-commented code snippets.
   - **Step-by-step Algorithms**: When processes or procedures are involved, list every step.
   - **Worked Practical Example**: Include at least one concrete numerical or code example per major concept.
   - **Professor Callouts**: Highlight subtle edge cases and frequent exam pitfalls found in the notes.

Format with clear Markdown headers:
# Course Notes: [Course Title]
## Unit [X]: [Unit Title]
### 1. [Topic Name]
...
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

    const kitHeader = `\n\n---\n### 📑 Quick-Revision Kit & Exam Trap Callouts\n`;
    const prompt = `
Based on the notes just generated for ${state.subject || 'this course'}, produce a concise Quick-Revision Kit:
1. "Key Formulas & Syntax Cheat Sheet": A Markdown table summarizing crucial formulas or commands.
2. "Top 3 Common Exam Mistakes": Pitfalls students frequently make on these specific topics.

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
