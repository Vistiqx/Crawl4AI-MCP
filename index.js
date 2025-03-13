#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { Command } from 'commander';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';
import { crawlWebsite } from './crawler.js';
import { processText } from './processor.js';

// Load environment variables
dotenv.config();

// Set up logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'crawl4ai.log' })
  ]
});

// Setup CLI
const program = new Command();
program
  .name('crawl4ai-mcp')
  .description('MCP Server for web crawling AI tasks')
  .version('1.0.0');

program
  .option('-p, --port <number>', 'port to run the server on', '3000')
  .option('-d, --debug', 'enable debug logging', false);

program.parse();
const options = program.opts();

// Set up debugger based on options
if (options.debug) {
  logger.level = 'debug';
  logger.debug('Debug mode enabled');
}

// Initialize express app
const app = express();
app.use(express.json({ limit: '50mb' }));

// Define API endpoints
app.post('/api/crawl', async (req, res) => {
  try {
    const { url, depth, selector, aiProcessing } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    logger.info(`Starting crawl of ${url} with depth ${depth || 1}`);
    
    const crawlResults = await crawlWebsite(url, {
      depth: depth || 1,
      selector: selector || 'body',
      logger
    });
    
    let results = crawlResults;
    
    // Process with AI if requested
    if (aiProcessing) {
      logger.info('Processing crawled content with AI');
      results = await processText(crawlResults, {
        task: aiProcessing.task,
        model: aiProcessing.model || 'claude-3-sonnet-20240229',
        logger
      });
    }
    
    return res.json({ 
      success: true,
      results,
      meta: {
        crawledAt: new Date().toISOString(),
        pagesProcessed: crawlResults.length
      }
    });
  } catch (error) {
    logger.error(`Error in /api/crawl: ${error.message}`);
    return res.status(500).json({ 
      error: error.message,
      stack: options.debug ? error.stack : undefined
    });
  }
});

app.get('/api/healthcheck', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Start the server
const PORT = options.port || process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Crawl4AI MCP Server running on port ${PORT}`);
  logger.info('Ready for crawling requests!');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down Crawl4AI MCP Server...');
  process.exit(0);
});

export default app;
