const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const OpenAI = require("openai");

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 4,
  fetch: async (url, init) => {
      // Force connection close to prevent Node `fetch` (undici) from accumulating __cf_bm cookies
      // and bloated keep-alive headers which cause "431 Request headers are too large".
      const customInit = { ...init };
      customInit.headers = { ...customInit.headers, 'Connection': 'close' };
      if (customInit.headers['cookie']) delete customInit.headers['cookie'];
      if (customInit.headers['Cookie']) delete customInit.headers['Cookie'];
      
      return fetch(url, customInit);
  }
});

/**
 * Generates topics and suggested questions from document text chunks
 * using gpt-4o-mini.
 */
exports.generateDocumentInsights = async (textChunks) => {
    try {
        // We take up to the first 5 chunks (approx 5000 chars) to understand the context without blowing context window limits
        const contextText = textChunks.slice(0, 5).join("\n\n---\n\n");
        
        const prompt = `
You are an expert AI teaching assistant for university students. 
Analyze the following text excerpts from a university document and provide two things:
1. "Topics": A comma-separated list of the 3 to 5 most important concepts or topics covered in the document.
2. "Questions": 3 suggested questions a student might ask about this material to study for an exam.

Output exactly in this JSON format (do not include markdown blocks or any other text):
{
  "topics": "Topic 1, Topic 2, Topic 3",
  "questions": "1. First question?\\n2. Second question?\\n3. Third question?"
}

--- Document Text ---
${contextText}
`;

        const completion = await openaiClient.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }]
        });

        const resultText = completion.choices[0].message.content;
        return JSON.parse(resultText);
    } catch (error) {
        console.error("Error generating insights via OpenAI:", error);
        throw error;
    }
};

/**
 * Generates embeddings for an array of text chunks using text-embedding-3-small.
 * Returns an array of vector arrays.
 * Processes chunks in batches to avoid OpenAI 500 errors and timeout limits.
 */
exports.generateEmbeddings = async (textChunks) => {
    try {
        const BATCH_SIZE = 50;
        let allEmbeddings = [];
        
        for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
            const batch = textChunks.slice(i, i + BATCH_SIZE);
            
            const response = await openaiClient.embeddings.create({
                model: "text-embedding-3-small",
                input: batch,
                encoding_format: "float",
            });
            
            // Sort to ensure order matches the input batch order
            const batchEmbeddings = response.data.sort((a, b) => a.index - b.index).map(item => item.embedding);
            allEmbeddings = allEmbeddings.concat(batchEmbeddings);
            
            // Brief pause between batches to respect rate limits
            if (i + BATCH_SIZE < textChunks.length) {
                await new Promise(res => setTimeout(res, 500));
            }
        }
        
        return allEmbeddings;
    } catch (error) {
        console.error("Error generating embeddings via OpenAI:", error);
        throw error;
    }
};

exports.openaiClient = openaiClient;
