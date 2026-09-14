'use strict';

const { Annotation } = require('@langchain/langgraph');

/**
 * Shared state schema for LangGraph agent workflows
 */
const AgentStateAnnotation = Annotation.Root({
    // Input parameters
    userMessage: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
    history: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
    subject: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
    intent: Annotation({ reducer: (x, y) => y ?? x, default: () => 'casual' }),
    
    // Exam & generation parameters
    examType: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
    format: Annotation({ reducer: (x, y) => y ?? x, default: () => 'mcq' }),
    units: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
    
    // Retrieval bundles
    pyqChunks: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
    syllabusChunks: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
    notesChunks: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
    
    // Structured planning data
    checklist: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
    unitQuotas: Annotation({ reducer: (x, y) => y ?? x, default: () => ({}) }),
    extractedPYQs: Annotation({ reducer: (x, y) => y ?? x, default: () => ({}) }),
    minedContent: Annotation({ reducer: (x, y) => y ?? x, default: () => ({}) }),

    // Output & reflection state
    generatedContent: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
    confidence: Annotation({ reducer: (x, y) => y ?? x, default: () => 1.0 }),
    issues: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
    correctionAttempts: Annotation({ reducer: (x, y) => y ?? x, default: () => 0 }),
    needsCorrection: Annotation({ reducer: (x, y) => y ?? x, default: () => false }),
    attributionReport: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),

    // Real-time callbacks
    onStep: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
    onToken: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
});

module.exports = {
    AgentStateAnnotation,
};
