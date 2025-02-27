import { NextResponse } from 'next/server';
import { aiAgent } from './utils/agent';
import { getMatchingText } from './utils/queryDb';


export async function POST(request: Request) {
  try {
    console.log('Received query request');
    
    // Parse the request body
    const requestBody = await request.json();
    const { query, indexName } = requestBody;

    // Validate required fields
    if (!indexName) {
      console.error('Missing required field: indexName');
      return NextResponse.json(
        { error: 'Index name is required' },
        { status: 400 }
      );
    }

    if (!query) {
      console.error('Missing required field: query');
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log(`Processing query: "${query}" on index: ${indexName}`);

    // Get the matching text content from Pinecone
    const matchingText = await getMatchingText(query, indexName);
    console.log('Matching text content:', matchingText);

    // Refactor the matching text with AI agent
    const { answer } = await aiAgent(matchingText, query);
    console.log('AI Agent response:', answer);
    
    // Return the answer along with matching document information
    // Note: `answer` is always in markdown format
    return NextResponse.json({ 
      answer,
    });
    
  } catch (error) {
    console.error('Error in query API:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}