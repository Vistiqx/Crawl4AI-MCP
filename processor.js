import Anthropic from '@anthropic-ai/sdk';
import { createChunks } from './utils.js';

// Initialize the Anthropic client if API key is available
let anthropicClient;
try {
  if (process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
} catch (error) {
  console.warn('Failed to initialize Anthropic client:', error.message);
}

/**
 * Process crawled text content with AI
 * @param {Array} crawlResults - Array of crawl result objects
 * @param {Object} options - Processing options
 * @param {string} options.task - The task to perform (summarize, extract, analyze, etc.)
 * @param {string} options.model - AI model to use
 * @param {Object} options.logger - Winston logger instance
 * @returns {Object} - Processed results
 */
export async function processText(crawlResults, options = {}) {
  const {
    task = 'summarize',
    model = 'claude-3-sonnet-20240229',
    maxTokens = 4000,
    temperature = 0.7,
    logger = console
  } = options;
  
  // Check if Anthropic client is available
  if (!anthropicClient) {
    logger.warn('Anthropic API key not found. AI processing skipped.');
    return {
      error: 'Anthropic API key not configured',
      originalResults: crawlResults
    };
  }
  
  logger.info(`Processing ${crawlResults.length} pages with AI, task: ${task}`);
  
  // Create a single document from all crawled pages
  const combinedText = crawlResults.map(page => {
    return `## Page: ${page.title} (${page.url})\n\n${page.content}\n\n`;
  }).join('\n---\n\n');
  
  // Create chunks to avoid token limits
  const chunks = createChunks(combinedText, 100000); // characters, not tokens
  
  // Process each chunk
  const processedChunks = [];
  
  for (let i = 0; i < chunks.length; i++) {
    logger.debug(`Processing chunk ${i+1}/${chunks.length}`);
    
    let prompt;
    
    // Create appropriate prompt based on task
    switch (task.toLowerCase()) {
      case 'summarize':
        prompt = `Please provide a comprehensive summary of the following web content. Focus on the main points, key information, and overall themes:

${chunks[i]}

Provide a well-structured summary with key points, important details, and main conclusions.`;
        break;
        
      case 'extract':
        prompt = `Please extract all factual information from the following web content:

${chunks[i]}

Format the information as a list of verified facts found in the content.`;
        break;
        
      case 'analyze':
        prompt = `Please analyze the following web content:

${chunks[i]}

Provide:
1. Main topic overview
2. Key arguments or claims made
3. Evidence presented
4. Logical fallacies or biases (if any)
5. Quality assessment of the information
6. Connections between concepts
7. Areas where information might be missing`;
        break;
        
      case 'questions':
        prompt = `Based on the following web content:

${chunks[i]}

Generate 10 important questions that someone might have after reading this content, along with detailed answers based solely on the information provided.`;
        break;
        
      default:
        prompt = `Please ${task} the following web content:

${chunks[i]}`;
    }
    
    try {
      // Call Claude API
      const completion = await anthropicClient.messages.create({
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [
          { role: 'user', content: prompt }
        ]
      });
      
      processedChunks.push(completion.content[0].text);
    } catch (error) {
      logger.error(`Error calling Claude API: ${error.message}`);
      processedChunks.push(`[Error processing chunk ${i+1}: ${error.message}]`);
    }
  }
  
  // If there are multiple chunks, we might want to combine them with another API call
  let finalResult = processedChunks.join('\n\n');
  
  if (processedChunks.length > 1) {
    try {
      logger.debug('Combining multiple chunk results with additional API call');
      
      const combiningPrompt = `You've analyzed multiple chunks of web content and provided separate analyses. Please combine and synthesize these separate analyses into a single coherent response:

${finalResult}

Provide a unified, well-structured response that combines all the information without repetition.`;
      
      const completion = await anthropicClient.messages.create({
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [
          { role: 'user', content: combiningPrompt }
        ]
      });
      
      finalResult = completion.content[0].text;
    } catch (error) {
      logger.error(`Error combining results: ${error.message}`);
      // Keep the concatenated results if combining fails
    }
  }
  
  return {
    task,
    result: finalResult,
    meta: {
      model,
      processedAt: new Date().toISOString(),
      pagesProcessed: crawlResults.length,
      chunksProcessed: chunks.length
    },
    originalResults: crawlResults
  };
}
