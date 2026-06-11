/**
 * Chunks a large string of text into overlapping segments.
 * 
 * @param {string} text - The input text to chunk.
 * @param {number} chunkSize - The maximum number of characters per chunk.
 * @param {number} overlap - The number of characters to overlap between chunks.
 * @returns {string[]} - An array of text chunks.
 */
exports.chunkText = (text, chunkSize = 1000, overlap = 200) => {
    if (!text || text.trim().length === 0) return [];
    
    // Safety check to ensure overlap isn't larger than the chunk size
    if (overlap >= chunkSize) {
        overlap = Math.floor(chunkSize / 2);
    }

    const chunks = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
        let endIndex = currentIndex + chunkSize;

        // If we're not at the end of the text, try to find a natural break (like a newline or space)
        if (endIndex < text.length) {
            // Look for a newline character within the last 100 characters of the chunk
            const lastNewline = text.lastIndexOf('\n', endIndex);
            if (lastNewline > currentIndex && lastNewline > endIndex - 100) {
                endIndex = lastNewline;
            } else {
                // Otherwise, look for a space
                const lastSpace = text.lastIndexOf(' ', endIndex);
                if (lastSpace > currentIndex) {
                    endIndex = lastSpace;
                }
            }
        }

        chunks.push(text.slice(currentIndex, endIndex).trim());

        // Move the index forward, accounting for overlap
        currentIndex = endIndex - overlap;
        
        // Prevent infinite loops if overlap logic fails
        if (currentIndex <= chunks.length * (chunkSize - overlap) - chunkSize) {
            currentIndex += overlap; // Fallback to strict advancement
        }
    }

    return chunks;
};
