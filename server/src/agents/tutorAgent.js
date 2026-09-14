'use strict';

const { StateGraph, START, END } = require('@langchain/langgraph');
const { AgentStateAnnotation } = require('./agentState');
const { performHybridSearch } = require('../services/search.service');
const { streamLLM } = require('./llmAdapter');

async function tutorResolveNode(state) {
    if (state.onStep) {
        state.onStep({
            step: 'tutor_analyzing',
            label: 'Analyzing Question & Context',
            icon: 'tutor',
            description: 'Locating referenced question in conversation history'
        });
    }

    let notesChunks = [];
    if (state.subject) {
        try {
            const results = await performHybridSearch(state.userMessage, { subject: state.subject }, 15);
            notesChunks = results || [];
        } catch (e) {
            console.warn('[TutorAgent] Search error:', e.message);
        }
    }

    return { notesChunks };
}

async function tutorExplainNode(state) {
    if (state.onStep) {
        state.onStep({
            step: 'tutor_solving',
            label: 'Generating Step-by-Step Pedagogical Explanation',
            icon: 'generator',
            description: 'Solving problem with derivations, code breakdown, and analogies'
        });
    }

    const contextText = (state.notesChunks || []).slice(0, 10).map(c => c.text).join('\n---\n');

    const historyMessages = (state.history || []).slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content || '',
    }));

    const systemPrompt = `
You are the Dedicated Academic Tutor for Verto AI.
The student is asking for targeted help, an explanation, or a step-by-step solution to a problem.

Teaching Guidelines:
1. Break down complex steps logically (Step 1, Step 2, Step 3).
2. If explaining an MCQ: clearly show why the correct answer is correct AND why each of the other distractors is incorrect.
3. If explaining code: provide line-by-line commentary.
4. If explaining math/physics: show full algebraic derivations using LaTeX.
5. Provide an intuitive real-world analogy to make the concept stick.

--- Course Material Context ---
${contextText || 'General University Knowledge'}
`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: state.userMessage }
    ];

    let generatedContent = '';
    await streamLLM({
        messages,
        temperature: 0.4,
        confidence: 0.9,
        onToken: (token) => {
            generatedContent += token;
            if (state.onToken) state.onToken(token);
        }
    });

    return { generatedContent };
}

function buildTutorAgentGraph() {
    const workflow = new StateGraph(AgentStateAnnotation)
        .addNode('tutorResolve', tutorResolveNode)
        .addNode('tutorExplain', tutorExplainNode)
        .addEdge(START, 'tutorResolve')
        .addEdge('tutorResolve', 'tutorExplain')
        .addEdge('tutorExplain', END);

    return workflow.compile();
}

const tutorAgentGraph = buildTutorAgentGraph();

module.exports = {
    tutorAgentGraph,
};
