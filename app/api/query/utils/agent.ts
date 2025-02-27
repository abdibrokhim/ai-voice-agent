import OpenAI from 'openai';
import { SYSTEM_PROMPT_BASE } from './prompts';

// Initialize OpenAI client
const initializeOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not set');
  }
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

export async function aiAgent(searchResults: string, query: string) {
  try {
    console.log('AI Agent started processing query');
    
    // Initialize OpenAI client
    const openaiClient = initializeOpenAI();
    
    // Define system prompt
    const systemPrompt = SYSTEM_PROMPT_BASE;

    const userQuery = `
# Please provide a response based on the context below.
## Remember: 
If you see paragraph something similar to this: "For more detailed insights, you can read the full article [here](https://www.layerpath.com/resources/blog/interactive-demos-for-lead-generationcontent).".
Make sure to modify the response in human listenable format. 
For example you can say: "for more detailed insights, you can read the full article on LayerPath's blog about interactive demos for lead generation. I will leave the link below.".

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