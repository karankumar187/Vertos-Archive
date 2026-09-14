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
    onProvider,
}) {
    let capturedProvider = null;
    const handleProvider = (info) => {
        capturedProvider = info;
        if (onProvider) onProvider(info);
    };

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
        onProvider: handleProvider,
        providerInfo: null,
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

    let result = null;
    if (intent === 'exam') {
        result = await examAgentGraph.invoke(initialState);
    } else if (intent === 'notes') {
        result = await notesAgentGraph.invoke(initialState);
    } else if (intent === 'syllabus') {
        result = await syllabusAgentGraph.invoke(initialState);
    } else if (intent === 'tutor') {
        result = await tutorAgentGraph.invoke(initialState);
    } else {
        throw new Error(`Unknown or unhandled intent: ${intent}`);
    }

    if (result && capturedProvider) {
        result.providerInfo = capturedProvider;
    }
    return result;
}

module.exports = {
    classifyIntent,
    runAgentWorkflow,
    examAgentGraph,
    notesAgentGraph,
    syllabusAgentGraph,
    tutorAgentGraph,
};
