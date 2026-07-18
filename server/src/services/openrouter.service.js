const axios = require('axios');

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const PRIMARY_MODEL   = 'qwen/qwen3-235b-a22b';

/**
 * Non-streaming call to Qwen 3 for lightweight tasks like query classification.
 * Cheap and fast — returns just the text content of the response.
 *
 * @param {Array} messages - OpenAI-style messages array.
 * @param {number} maxTokens - Max tokens for the response.
 * @returns {Promise<string>} - The model's response text.
 */
exports.chatCompletion = async (messages, maxTokens = 100) => {
    const response = await axios.post(
        `${OPENROUTER_BASE}/chat/completions`,
        {
            model: PRIMARY_MODEL,
            messages,
            max_tokens: maxTokens,
            stream: false,
        },
        {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://vertos-archive.vercel.app',
                'X-Title': 'Vertos Archive',
            },
        }
    );
    return response.data.choices[0].message.content || '';
};

/**
 * Streaming call to Qwen 3 via OpenRouter using SSE.
 * Returns a Node.js readable stream of raw SSE data chunks from OpenRouter.
 *
 * @param {Array} messages - OpenAI-style messages array.
 * @param {number} maxTokens - Max tokens for the response.
 * @returns {Promise<import('stream').Readable>} - The raw axios response data stream.
 */
exports.streamChatCompletion = async (messages, maxTokens = 16000) => {
    const response = await axios.post(
        `${OPENROUTER_BASE}/chat/completions`,
        {
            model: PRIMARY_MODEL,
            messages,
            max_tokens: maxTokens,
            stream: true,
        },
        {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://vertos-archive.vercel.app',
                'X-Title': 'Vertos Archive',
            },
            responseType: 'stream',
        }
    );
    return response.data;
};
