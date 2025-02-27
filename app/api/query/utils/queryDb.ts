import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

/**
 * Metadata interface for Pinecone vectors.
 */
interface VectorMetadata {
    text: string;
}

/**
 * Embeds the user query using OpenAI, queries the Pinecone vector database
 * for the most similar vector, and returns the associated text content.
 * 
 * @param query - The user's query string.
 * @returns A promise that resolves to the text content of the top matching vector.
 */
export async function getMatchingText(query: string, indexName: string): Promise<string> {
    // Step 1: Embed the query using OpenAI
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not set');
    }
    const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY, 
    });
    const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Step 2: Query Pinecone vector database
    if (!process.env.PINECONE_API_KEY) {
        throw new Error("Pinecone API key is not set.");
    }
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    });
    const index = pinecone.index(indexName);
    const queryResponse = await index.query({
        vector: queryEmbedding,
        topK: 1,
        includeMetadata: true,
    });

    // Step 3: Extract and return the text content from metadata
    if (queryResponse.matches && queryResponse.matches.length > 0) {
        const topMatch = queryResponse.matches[0];
        const metadata = topMatch.metadata as Partial<VectorMetadata>;
        const textContent = metadata?.text || 'No text found';
        return textContent;
    } else {
        return 'No matching vectors found';
    }
}

// Example usage
// async function main() {
//     try {
//         const query = 'How to personalize the demo experience?';
//         // Get the matching text content
//         const result = await getMatchingText(query);
//         console.log('Matching text content:', result);
//         // Refactor the result with AI Agent
//         const agent = await aiAgent(result, query);
//         console.log('AI Agent response:', agent);
//     } catch (error) {
//         console.error('Error retrieving matching text:', error);
//     }
// }

// main();