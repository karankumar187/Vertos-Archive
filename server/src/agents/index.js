'use strict';

const { classifyIntent } = require('./orchestratorAgent');
const { examAgentGraph } = require('./examAgent');
const { notesAgentGraph } = require('./notesAgent');
const { syllabusAgentGraph } = require('./syllabusAgent');
const { tutorAgentGraph } = require('./tutorAgent');

/**
 * Dispatches a user query to the appropriate LangGraph agent workflow.
 */
async function runAgentWorkflow({
    intent,
    userMessage,
    history = [],
    subject = '',
    examType = null,
    format = 'mcq',
    units = [],
    onStep,
    onToken,
}) {
    const initialState = {
        userMessage,
        history,
        subject,
        intent,
        examType,
        format,
        units,
        onStep,
        onToken,
        pyqChunks: [],
        syllabusChunks: [],
        notesChunks: [],
        checklist: [],
        unitQuotas: {},
        generatedContent: '',
        confidence: 1.0,
        issues: [],
        correctionAttempts: 0,
        needsCorrection: false,
    };

    console.log(`[Agent Dispatcher] Invoking workflow for intent='${intent}', subject='${subject}', examType='${examType}', units=[${units}]`);

    if (intent === 'exam') {
        return await examAgentGraph.invoke(initialState);
    } else if (intent === 'notes') {
        return await notesAgentGraph.invoke(initialState);
    } else if (intent === 'syllabus') {
        return await syllabusAgentGraph.invoke(initialState);
    } else if (intent === 'tutor') {
        return await tutorAgentGraph.invoke(initialState);
    } else {
        throw new Error(`Unknown or unhandled intent: ${intent}`);
    }
}

module.exports = {
    classifyIntent,
    runAgentWorkflow,
    examAgentGraph,
    notesAgentGraph,
    syllabusAgentGraph,
    tutorAgentGraph,
};
