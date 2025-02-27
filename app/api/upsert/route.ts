import { NextResponse } from 'next/server';
import { processMarkdownFile } from './utils/upsertData';
import { hashString } from './utils/helpers';

export async function POST(request: Request) {
  try {
    const { filePath, indexName } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: 'filePath is required.' }, { status: 400 });
    }

    if (!indexName) {
      return NextResponse.json({ error: 'indexName is required.' }, { status: 400 });
    }

    console.log(`Starting processing for index: ${indexName}`);

    // Generate a unique ID for the file
    const fileId = hashString(filePath);

    // Process the file and upsert to Pinecone
    await processMarkdownFile(filePath, fileId, indexName);

    console.log("All files have been processed and embeddings stored in Pinecone.");

    return NextResponse.json({
      success: true,
      message: 'Content embedded and stored successfully.',
    });
  } catch (error) {
    console.error('Error uploading content:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
