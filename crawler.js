import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { URL } from 'url';

/**
 * Crawls a website starting from the specified URL
 * @param {string} startUrl - The URL to start crawling from
 * @param {Object} options - Crawling options
 * @param {number} options.depth - How many levels deep to crawl (default: 1)
 * @param {string} options.selector - CSS selector for content extraction (default: 'body')
 * @param {Object} options.logger - Winston logger instance
 * @returns {Array} - Array of page data objects
 */
export async function crawlWebsite(startUrl, options = {}) {
  const {
    depth = 1,
    selector = 'body',
    maxPages = 100,
    respectRobotsTxt = true,
    waitTime = 1000,
    logger = console
  } = options;
  
  logger.info(`Starting crawl of ${startUrl} with depth ${depth}`);
  
  // Validate URL
  let baseUrl;
  try {
    baseUrl = new URL(startUrl);
    logger.debug(`Base domain: ${baseUrl.hostname}`);
  } catch (error) {
    throw new Error(`Invalid URL: ${startUrl}`);
  }
  
  // Initialize browser
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Initialize crawling state
    const visited = new Set();
    const queue = [{ url: startUrl, depth: 0 }];
    const results = [];
    
    // Check robots.txt if enabled
    let robotsRules = {};
    if (respectRobotsTxt) {
      try {
        const robotsUrl = `${baseUrl.protocol}//${baseUrl.hostname}/robots.txt`;
        logger.debug(`Checking robots.txt at ${robotsUrl}`);
        
        const response = await fetch(robotsUrl);
        const text = await response.text();
        
        // Simple robots.txt parsing - can be enhanced
        robotsRules = parseRobotsTxt(text);
        logger.debug(`Found ${Object.keys(robotsRules.disallow || {}).length} disallow rules`);
      } catch (error) {
        logger.warn(`Could not fetch robots.txt: ${error.message}`);
      }
    }
    
    // Main crawling loop
    while (queue.length > 0 && results.length < maxPages) {
      const { url, depth: currentDepth } = queue.shift();
      
      // Skip if already visited
      if (visited.has(url)) {
        continue;
      }
      
      // Check if URL is allowed by robots.txt
      if (respectRobotsTxt && isDisallowed(url, robotsRules)) {
        logger.debug(`Skipping ${url} - disallowed by robots.txt`);
        continue;
      }
      
      // Skip if not same domain
      const urlObj = new URL(url);
      if (urlObj.hostname !== baseUrl.hostname) {
        logger.debug(`Skipping ${url} - different domain`);
        continue;
      }
      
      // Mark as visited
      visited.add(url);
      logger.debug(`Crawling ${url} (depth ${currentDepth})`);
      
      // Open page
      const page = await browser.newPage();
      
      try {
        // Set reasonable timeout
        await page.setDefaultNavigationTimeout(30000);
        
        // Navigate to URL
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        // Allow time for JavaScript to execute
        await page.waitForTimeout(waitTime);
        
        // Extract page title and content
        const pageTitle = await page.title();
        const content = await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          return element ? element.innerText : '';
        }, selector);
        
        // Get page metadata
        const metaDescription = await page.evaluate(() => {
          const meta = document.querySelector('meta[name="description"]');
          return meta ? meta.getAttribute('content') : '';
        });
        
        // Get page HTML for further processing
        const html = await page.content();
        
        // Store page data
        results.push({
          url,
          title: pageTitle,
          description: metaDescription,
          content,
          html: html,
          crawledAt: new Date().toISOString()
        });
        
        // Find links if we need to go deeper
        if (currentDepth < depth) {
          const links = await extractLinks(page, url);
          
          // Add new links to queue
          for (const link of links) {
            if (!visited.has(link)) {
              queue.push({ url: link, depth: currentDepth + 1 });
            }
          }
        }
      } catch (error) {
        logger.error(`Error processing ${url}: ${error.message}`);
      } finally {
        await page.close();
      }
    }
    
    logger.info(`Crawl completed. Processed ${results.length} pages.`);
    return results;
  } finally {
    await browser.close();
  }
}

/**
 * Extract all links from a page
 * @param {Page} page - Puppeteer page object
 * @param {string} baseUrl - The base URL for resolving relative links
 * @returns {Array} - Array of absolute URLs
 */
async function extractLinks(page, baseUrl) {
  const links = await page.evaluate((base) => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    return anchors.map(a => {
      try {
        // Convert to absolute URL
        return new URL(a.href, base).href;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
  }, baseUrl);
  
  return [...new Set(links)]; // Deduplicate
}

/**
 * Simple robots.txt parser
 * @param {string} robotsTxt - Content of robots.txt file
 * @returns {Object} - Parsed rules
 */
function parseRobotsTxt(robotsTxt) {
  const rules = {
    allow: {},
    disallow: {}
  };
  
  const lines = robotsTxt.split('\n');
  let currentUserAgent = '*';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip comments and empty lines
    if (trimmedLine.startsWith('#') || trimmedLine === '') {
      continue;
    }
    
    // Parse user-agent
    if (trimmedLine.toLowerCase().startsWith('user-agent:')) {
      currentUserAgent = trimmedLine.split(':')[1].trim();
      if (!rules.allow[currentUserAgent]) rules.allow[currentUserAgent] = [];
      if (!rules.disallow[currentUserAgent]) rules.disallow[currentUserAgent] = [];
      continue;
    }
    
    // Parse allow rules
    if (trimmedLine.toLowerCase().startsWith('allow:')) {
      const path = trimmedLine.split(':')[1].trim();
      if (!rules.allow[currentUserAgent]) rules.allow[currentUserAgent] = [];
      rules.allow[currentUserAgent].push(path);
      continue;
    }
    
    // Parse disallow rules
    if (trimmedLine.toLowerCase().startsWith('disallow:')) {
      const path = trimmedLine.split(':')[1].trim();
      if (!rules.disallow[currentUserAgent]) rules.disallow[currentUserAgent] = [];
      rules.disallow[currentUserAgent].push(path);
      continue;
    }
  }
  
  return rules;
}

/**
 * Check if a URL is disallowed by robots.txt
 * @param {string} url - URL to check
 * @param {Object} rules - Parsed robots.txt rules
 * @returns {boolean} - True if URL is disallowed
 */
function isDisallowed(url, rules) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Check rules for user agent '*' (default)
    const disallowRules = rules.disallow['*'] || [];
    const allowRules = rules.allow['*'] || [];
    
    // Check if path is explicitly allowed
    for (const rule of allowRules) {
      if (path.startsWith(rule)) {
        return false;
      }
    }
    
    // Check if path is disallowed
    for (const rule of disallowRules) {
      if (path.startsWith(rule)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false; // If there's an error parsing the URL, allow it
  }
}
