const axios = require('axios');

/**
 * Generates embeddings using HuggingFace Inference API for BAAI/bge-m3.
 * bge-m3 generates 1024-dimensional vectors.
 * 
 * @param {string[]} texts - Array of text strings to embed.
 * @returns {Promise<number[][]>} - Array of embedding vectors.
 */
exports.generateEmbeddings = async (texts) => {
    if (!process.env.HF_API_KEY) {
        throw new Error('HF_API_KEY is not defined in environment variables.');
    }

    try {
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/BAAI/bge-m3',
            { inputs: texts },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.HF_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // HuggingFace feature extraction endpoints usually return a 3D array [batch, tokens, features] 
        // or a 2D array [batch, features] if pooling is already applied by the pipeline.
        // For BAAI/bge-m3 feature extraction, it usually returns a 2D array [batch, 1024].
        
        let embeddings = response.data;
        
        // Handle cases where the model is loading
        if (embeddings.error && embeddings.estimated_time) {
            console.log(`[HuggingFace] Model is loading. Waiting ${embeddings.estimated_time} seconds...`);
            await new Promise(resolve => setTimeout(resolve, embeddings.estimated_time * 1000 + 1000));
            return exports.generateEmbeddings(texts);
        }

        // BGE-M3 might return [batch_size, sequence_length, hidden_size]
        // If it's a 3D array, we need to take the CLS token (index 0) or mean pooling.
        if (Array.isArray(embeddings) && Array.isArray(embeddings[0]) && Array.isArray(embeddings[0][0])) {
            console.log("[HuggingFace] Received 3D tensor, extracting CLS tokens...");
            embeddings = embeddings.map(seq => seq[0]);
        }

        return embeddings;
    } catch (error) {
        console.error('[HuggingFace] Error generating embeddings:', error.response?.data || error.message);
        throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
};
