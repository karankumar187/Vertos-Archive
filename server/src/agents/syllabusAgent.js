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
    if (state.onStep) {
        state.onStep({
            step: 'structuring_blueprint',
            label: 'Structuring 6-Unit Course Blueprint',
            icon: 'alignment',
            description: 'Extracting unit titles, credit breakdown, and recommended textbooks'
        });
    }

    const syllabusText = (state.syllabusChunks || []).map(c => c.text).join('\n---\n');

    const systemPrompt = `
You are the Course Architect for Verto AI.
Format an official, structured syllabus document for ${state.subject || 'the course'}.

Format Requirements:
1. **Course Header**: Course Code, Course Title, Credit Weightage, Prerequisites.
2. **6-Unit Breakdown**: Provide Unit 1 through Unit 6 with detailed bulleted topics under each.
3. **Prescribed Textbooks & Reference Materials**: Author, Title, Edition.
4. **Assessment Weightage**: Continuous Assessment (CA: 30%), Mid-Term (20%), End-Term (ETE: 50%).

--- Syllabus Archive ---
${syllabusText || 'No uploaded syllabus found. Provide the standard curriculum outline for this course code.'}
`;

    let generatedContent = '';
    await streamLLM({
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Provide the complete syllabus structure for ${state.subject || 'the course'}.` }
        ],
        temperature: 0.2,
        confidence: 0.9,
        onToken: (token) => {
            generatedContent += token;
            if (state.onToken) state.onToken(token);
        }
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
