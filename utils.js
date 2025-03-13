/**
 * Creates chunks of text to avoid token limits
 * @param {string} text - The text to chunk
 * @param {number} maxChunkSize - Maximum characters per chunk
 * @returns {Array} - Array of text chunks
 */
export function createChunks(text, maxChunkSize = 100000) {
  const chunks = [];
  
  // If text is shorter than max size, return as a single chunk
  if (text.length <= maxChunkSize) {
    return [text];
  }
  
  // Split by paragraphs (double newlines)
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';
  
  // Group paragraphs into chunks
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the limit
    if (currentChunk.length + paragraph.length + 2 > maxChunkSize) {
      // If the current chunk is not empty, add it to chunks
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      
      // If a single paragraph is larger than maxChunkSize, split it
      if (paragraph.length > maxChunkSize) {
        // Split large paragraph by sentences
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length > maxChunkSize) {
            if (sentenceChunk.length > 0) {
              chunks.push(sentenceChunk);
              sentenceChunk = '';
            }
            
            // If single sentence is too long, split by char
            if (sentence.length > maxChunkSize) {
              for (let i = 0; i < sentence.length; i += maxChunkSize) {
                chunks.push(sentence.slice(i, i + maxChunkSize));
              }
            } else {
              sentenceChunk = sentence;
            }
          } else {
            sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
          }
        }
        
        // Add any remaining sentence chunk
        if (sentenceChunk.length > 0) {
          chunks.push(sentenceChunk);
        }
      } else {
        // Start a new chunk with this paragraph
        currentChunk = paragraph;
      }
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add the last chunk if not empty
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Sanitizes HTML content to extract readable text
 * @param {string} html - HTML content
 * @returns {string} - Cleaned text
 */
export function sanitizeHtml(html) {
  // Simple HTML tag removal - for more complex cases use a library like cheerio
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  return text;
}

/**
 * Estimates token count for text (rough approximation)
 * @param {string} text - The text to estimate tokens for
 * @returns {number} - Estimated token count
 */
export function estimateTokenCount(text) {
  // Very simple approximation - around 4 chars per token for English
  return Math.ceil(text.length / 4);
}

/**
 * Gets domain from URL
 * @param {string} url - URL to process
 * @returns {string} - Domain name
 */
export function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return null;
  }
}

/**
 * Creates a delay using promises
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after the delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
