const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const OpenAI = require("openai");

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

async function test() {
  try {
    const completion = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-chat-v3-0324",
      messages: [
        {
          role: "user",
          content: "What is Retrieval Augmented Generation?"
        }
      ]
    });

    console.log(completion.choices[0].message.content);
  } catch (err) {
    console.error(err);
  }
}

test();