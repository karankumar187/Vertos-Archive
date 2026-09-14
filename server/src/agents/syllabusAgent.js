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
You are an expert academic advisor for Lovely Professional University.
Format an official, comprehensive syllabus document for ${state.subject}.
Do not mention internal architecture, agents, or pipeline nodes.
Ground all topics strictly on the uploaded syllabus archive text below.

Format Requirements:
1. **Course Header**: Course Code, Course Title, Credit Weightage, Prerequisites.
2. **6-Unit Breakdown**: Provide Unit 1 through Unit 6 with detailed bulleted topics under each based on the syllabus document.
3. **Prescribed Textbooks & Reference Materials**: Author, Title, Edition.
4. **Assessment Weightage**: Continuous Assessment (CA: 30%), Mid-Term (20%), End-Term (ETE: 50%).

--- Syllabus Archive ---
${syllabusText}
`;

    let generatedContent = '';
    await streamLLM({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Provide the complete syllabus structure for ${state.subject} based strictly on the uploaded syllabus.` }
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
