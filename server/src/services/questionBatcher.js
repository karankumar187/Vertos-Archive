'use strict';

const { createThinkFilter } = require('./llm.service');

// Maximum questions per LLM call — keeps each prompt within safe token limits
const BATCH_SIZE = 10;

// ---------------------------------------------------------------------------
// buildUnitBatches
// ---------------------------------------------------------------------------
/**
 * Builds an ordered list of batch descriptors for a given exam/task type.
 *
 * Each descriptor:  { unit: number|null, startQ: number, count: number }
 *   unit   — which syllabus unit this batch covers (null = unspecified)
 *   startQ — 1-indexed question number this batch starts at
 *   count  — how many questions to generate in this batch (≤ BATCH_SIZE)
 *
 * @param {'ete_mcq'|'ete_mixed_mcq'|'midterm_mcq'|'ca_mcq'|'ca_subjective'} taskType
 * @param {number[]} caUnits  — unit numbers for CA tasks (e.g. [1,2] or [1,2,3])
 * @returns {{ unit: number|null, startQ: number, count: number }[]}
 */
const buildUnitBatches = (taskType, caUnits = []) => {
    const batches = [];
    let qNum = 1;

    /** Helper: slice `total` questions for `unit` into BATCH_SIZE chunks */
    const addBatches = (unit, total) => {
        let remaining = total;
        while (remaining > 0) {
            const count = Math.min(BATCH_SIZE, remaining);
            batches.push({ unit, startQ: qNum, count });
            qNum    += count;
            remaining -= count;
        }
    };

    switch (taskType) {
        // ── ETE Format A: 60 MCQs, 6 units × 10 ────────────────────────────
        case 'ete_mcq':
            for (let u = 1; u <= 6; u++) addBatches(u, 10);
            break;

        // ── ETE Format B (MCQ part): 30 MCQs, 6 units × 5 ──────────────────
        case 'ete_mixed_mcq':
            for (let u = 1; u <= 6; u++) addBatches(u, 5);
            break;

        // ── Mid-Term MCQ: 40 questions — Unit1=13, Unit2=13, Unit3=14 ───────
        case 'midterm_mcq':
            addBatches(1, 13);
            addBatches(2, 13);
            addBatches(3, 14);
            break;

        // ── CA MCQ: 30 questions split evenly across specified units ─────────
        case 'ca_mcq': {
            if (caUnits.length === 0) { addBatches(null, 30); break; }
            const base  = Math.floor(30 / caUnits.length);
            let   extra = 30 % caUnits.length;
            caUnits.forEach(u => addBatches(u, base + (extra-- > 0 ? 1 : 0)));
            break;
        }

        // ── CA Subjective: 15 questions split evenly across specified units ──
        case 'ca_subjective': {
            if (caUnits.length === 0) { addBatches(null, 15); break; }
            const base  = Math.floor(15 / caUnits.length);
            let   extra = 15 % caUnits.length;
            caUnits.forEach(u => addBatches(u, base + (extra-- > 0 ? 1 : 0)));
            break;
        }

        default:
            break;
    }

    return batches;
};

// ---------------------------------------------------------------------------
// Task-type helpers
// ---------------------------------------------------------------------------

const TASK_DESCRIPTIONS = {
    ete_mcq:        'End Term Exam (ETE) — Full MCQ Paper (60 questions total, 10 per unit × 6 units)',
    ete_mixed_mcq:  'End Term Exam (ETE) — Mixed Paper, MCQ Section (30 MCQs total, 5 per unit × 6 units)',
    midterm_mcq:    'Mid Term Exam — MCQ Paper (40 questions total: Unit1=13, Unit2=13, Unit3=14)',
    ca_mcq:         'Class Assessment (CA) — MCQ Paper (30 questions total)',
    ca_subjective:  'Class Assessment (CA) — Subjective Paper (15 questions total)',
};

/**
 * Generates the per-batch user message.
 *
 * Batch 1: includes the original userQueryFinal (with all REMINDER injections)
 *          so the model knows the full context of what's being generated.
 * Batch 2+: gives a concise CONTINUATION instruction so the model doesn't
 *            re-read the full prompt but still knows numbering + unit.
 */
const makeBatchInstruction = ({ batchIdx, totalBatches, batch, taskType, subject, userQueryFinal }) => {
    const { unit, startQ, count } = batch;
    const endQ      = startQ + count - 1;
    const unitLabel = unit ? `Unit ${unit}` : 'the specified unit(s)';
    const courseLabel = subject ? ` for ${subject}` : '';
    const typeDesc  = TASK_DESCRIPTIONS[taskType] || 'exam paper';

    if (batchIdx === 0) {
        // First batch: use the full enriched user query + batch scope instruction
        return (
            `${userQueryFinal}\n\n` +
            `[BATCH SCOPE — Part 1 of ${totalBatches}]: ` +
            `Generate ONLY the questions for ${unitLabel}${courseLabel}. ` +
            `Number them strictly as ### Question ${startQ}: through ### Question ${endQ}: ` +
            `(EXACTLY ${count} questions). ` +
            `Output ONLY the numbered questions — no preamble, no headings like "Unit X Questions", no closing summary.`
        );
    }

    // Subsequent batches: compact continuation prompt
    return (
        `[CONTINUATION — Part ${batchIdx + 1} of ${totalBatches}]: ` +
        `You are generating a ${typeDesc}${courseLabel}. ` +
        `Continue where you left off. This batch covers ${unitLabel}. ` +
        `Generate EXACTLY ${count} questions numbered ### Question ${startQ}: through ### Question ${endQ}:. ` +
        `Follow ALL formatting rules from the system prompt (MCQ options on separate lines, LaTeX for math, code blocks for code, etc.). ` +
        `Output ONLY the questions — no introduction, no unit heading, no closing text.`
    );
};

// ---------------------------------------------------------------------------
// streamBatchedQuestions
// ---------------------------------------------------------------------------
/**
 * Sequentially generates a large exam paper in BATCH_SIZE-question chunks,
 * streaming each token through `onToken` as it arrives.
 *
 * @param {object} opts
 * @param {'ete_mcq'|'ete_mixed_mcq'|'midterm_mcq'|'ca_mcq'|'ca_subjective'} opts.taskType
 * @param {number[]}  opts.caUnits        — unit numbers for CA tasks
 * @param {string}    opts.subject        — course code/name (e.g. "CSE 332"), may be ''
 * @param {string}    opts.systemPrompt   — full system prompt (includes retrieved context)
 * @param {string}    opts.userQueryFinal — the enriched user message (with REMINDER injections)
 * @param {object}    opts.client         — OpenAI-compatible client (openaiClient or qwenClient)
 * @param {string}    opts.model          — model identifier string
 * @param {Function}  opts.onToken        — called with each visible token string
 *
 * @returns {Promise<string>} the full assembled response
 */
const streamBatchedQuestions = async ({
    taskType,
    caUnits = [],
    subject = '',
    systemPrompt,
    userQueryFinal,
    client,
    model,
    onToken,
}) => {
    const batches      = buildUnitBatches(taskType, caUnits);
    const totalBatches = batches.length;

    if (totalBatches === 0) return '';

    const isQwen = model.toLowerCase().includes('qwen');
    let fullResponse = '';

    console.log(`[QuestionBatcher] Starting: taskType=${taskType}, totalBatches=${totalBatches}, model=${model}`);

    for (let bIdx = 0; bIdx < totalBatches; bIdx++) {
        const batch = batches[bIdx];
        const { unit, startQ, count } = batch;
        const endQ = startQ + count - 1;

        const batchInstruction = makeBatchInstruction({
            batchIdx: bIdx,
            totalBatches,
            batch,
            taskType,
            subject,
            userQueryFinal,
        });

        // Each batch gets: system prompt + (for batch 1) user instruction
        // For batch 2+, we keep prompts lean — numbering in the instruction is
        // sufficient for continuity; we don't re-inject history to save tokens.
        const apiMessages = [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: batchInstruction },
        ];

        // Token budget: short batches (≤5 questions) need less space
        const maxTokens = count <= 5 ? 3000 : 6000;

        console.log(`[QuestionBatcher] Batch ${bIdx + 1}/${totalBatches} — Unit ${unit ?? '?'}, Q${startQ}–${endQ} (${count} questions)`);

        try {
            const stream = await client.chat.completions.create({
                model,
                messages: apiMessages,
                max_tokens: maxTokens,
                stream: true,
            });

            // Per-batch think-block filter (new instance per batch)
            const thinkFilter = isQwen ? createThinkFilter() : null;

            for await (const chunk of stream) {
                let token = chunk.choices[0]?.delta?.content ?? '';
                if (!token) continue;

                if (thinkFilter) {
                    token = thinkFilter(token);
                }

                if (token) {
                    fullResponse += token;
                    onToken(token);
                }
            }

            // Add a blank line separator between batches so questions don't run together
            if (bIdx < totalBatches - 1) {
                const sep = '\n';
                fullResponse += sep;
                onToken(sep);
            }

        } catch (err) {
            console.error(`[QuestionBatcher] Error in batch ${bIdx + 1}:`, err.message);
            throw err;
        }
    }

    console.log(`[QuestionBatcher] Done. Total response length: ${fullResponse.length} chars`);
    return fullResponse;
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = { buildUnitBatches, streamBatchedQuestions };
