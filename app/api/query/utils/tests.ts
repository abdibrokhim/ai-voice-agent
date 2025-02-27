import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
// import { aiAgent } from './agent';

// import { SYSTEM_PROMPT_BASE } from './prompts';

export const SYSTEM_PROMPT_BASE = `
You are an assistant that answers questions based on the provided context. 
The context consists of relevant documents from a vector database, and the user's query. 
Your task is to use the context to provide a accurate and helpful answer to the user's query. 
If the context is insufficient or does not provide enough information to answer the question, please indicate that.
`;

export async function aiAgent(searchResults: string, query: string) {
  try {
    console.log('AI Agent started processing query');
    
    // Initialize OpenAI client
    const openaiClient = new OpenAI({ apiKey: '' });
    
    // Define system prompt
    const systemPrompt = SYSTEM_PROMPT_BASE;

    const userQuery = `
# Please provide a response based on the context below.
Remember: Return the images as it is, no matter the format (e.g., markdown), do not modify them.

## Context:
${searchResults}

## User Query:
${query}
`;

    console.log('Sending request to OpenAI');
    
    // Generate completions for the query using OpenAI
    const completionsResponse = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userQuery
        }
      ],
      max_tokens: 512, // Increased token limit for more comprehensive answers
      temperature: 0.7 // Added temperature for more natural responses
    });

    console.log('Received response from OpenAI');
    
    if (!completionsResponse.choices || completionsResponse.choices.length === 0) {
      console.error('No completion choices returned from OpenAI');
      return { error: 'Failed to generate answer' };
    }

    const answer = completionsResponse.choices[0].message.content;
    console.log('AI Agent finished processing');
    
    return { answer };
  } catch (error: any) {
    console.error('Error in AI agent:', error);
    return { error: error.message || 'Unknown error in AI agent' };
  }
}

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
async function getMatchingText(query: string): Promise<string> {
    // Step 1: Embed the query using OpenAI
    const openai = new OpenAI({ apiKey: '' });
    const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Step 2: Query Pinecone vector database
    const pinecone = new Pinecone({
        apiKey: '',
    });
    const index = pinecone.index('exampleindex');
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