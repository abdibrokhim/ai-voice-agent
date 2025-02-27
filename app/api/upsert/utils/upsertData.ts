import fs from 'fs';
import { marked } from 'marked';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

/**
 * Processes a Markdown file by reading its content, chunking it, embedding it with OpenAI,
 * and upserting the embeddings into a Pinecone vector database.
 * 
 * @param filePath - The path to the Markdown file.
 * @param fileId - A unique identifier for the file to prefix vector IDs (e.g., 'doc1').
 */
export async function processMarkdownFile(filePath: string, fileId: string, indexName: string): Promise<void> {
    // Step 1: Read the Markdown file
    const markdownContent = fs.readFileSync(filePath, 'utf-8');

    // Step 2: Parse Markdown into tokens
    const tokens = marked.lexer(markdownContent);

    // Step 3: Group tokens into chunks based on headings
    const chunks: string[][] = [];
    let currentChunk: string[] = [];

    for (const token of tokens) {
        if (token.type === 'heading') {
            // If there's content in the current chunk, add it to chunks and start a new one
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = [];
            }
            currentChunk.push(token.text);
        } else if (token.type === 'paragraph' || token.type === 'text') {
            currentChunk.push(token.text);
        } else if (token.type === 'list') {
            // Append list item texts
            for (const item of token.items) {
                currentChunk.push(item.text);
            }
        }
        // Note: Additional token types (e.g., 'code', 'blockquote') could be handled here if needed
    }
    // Add the last chunk if it contains content
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    // Step 4: Split large chunks to respect token limits
    const maxWordsPerChunk = 500; // Adjust based on OpenAI's token limit (e.g., ~8192 tokens)
    const finalChunks: string[] = [];

    for (const chunk of chunks) {
        const chunkText = chunk.join('\n');
        const wordCount = chunkText.split(/\s+/).length;

        if (wordCount <= maxWordsPerChunk) {
            finalChunks.push(chunkText);
        } else {
            // Split into smaller chunks
            const paragraphs = chunk;
            let currentGroup: string[] = [];
            let currentWordCount = 0;

            for (const paragraph of paragraphs) {
                const paraWords = paragraph.split(/\s+/).length;
                if (currentWordCount + paraWords > maxWordsPerChunk && currentGroup.length > 0) {
                    finalChunks.push(currentGroup.join('\n'));
                    currentGroup = [];
                    currentWordCount = 0;
                }
                currentGroup.push(paragraph);
                currentWordCount += paraWords;
            }
            if (currentGroup.length > 0) {
                finalChunks.push(currentGroup.join('\n'));
            }
        }
    }

    if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not set.");
    }
    // Step 5: Generate embeddings using OpenAI
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY, // Replace with your OpenAI API key
    });

    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small', // Specify the embedding model
        input: finalChunks, // Batch process all chunks
    });

    const embeddings = response.data.map(d => d.embedding);

    // Step 6: Prepare vectors for Pinecone
    const vectors = finalChunks.map((chunk, index) => ({
        id: `${fileId}-${index}`, // Unique ID combining fileId and chunk index
        values: embeddings[index], // Embedding vector
        metadata: { text: chunk } // Optional metadata for retrieval
    }));
    console.log('Generated vectors:', vectors);

    // Step 7: Upsert vectors to Pinecone
    if (!process.env.PINECONE_API_KEY) {
        throw new Error("Pinecone API key is not set.");
    }
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY, // Replace with your Pinecone API key
    });

    // Step 8: Check whether the index exists then upsert the vectors
    // Check if index exists
    const existingIndexes = await pinecone.listIndexes();
    console.log('Existing indexes:', existingIndexes);

    if (!existingIndexes.indexes!.some(idx => idx.name === indexName)) {
        console.log(`Index '${indexName}' does not exist. Creating it...`);
        await pinecone.createIndex({
            name: indexName,
            dimension: 1536, // dimension for "text-embedding-3-small"
            metric: 'cosine',
            spec: {
                serverless: {
                cloud: 'aws',
                region: 'us-east-1'
                }
            }
        });
        console.log(`Index '${indexName}' created successfully.`);
    } else {
        console.log(`Index '${indexName}' already exists.`);
    }

    const index = pinecone.index(indexName); // Replace with your Pinecone index name
    await index.upsert(vectors);

    console.log('Upserted vectors to Pinecone successfully.');

    return;
}
