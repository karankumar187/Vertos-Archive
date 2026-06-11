const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const OpenAI = require("openai");

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

/**
 * Generates topics and suggested questions from document text chunks
 * using google/gemini-2.5-flash via OpenRouter.
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

        const completion = await openrouter.chat.completions.create({
            model: "google/gemini-2.5-flash",
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }]
        });

        const resultText = completion.choices[0].message.content;
        return JSON.parse(resultText);
    } catch (error) {
        console.error("Error generating insights via OpenRouter:", error);
        throw error;
    }
};

exports.openrouter = openrouter;