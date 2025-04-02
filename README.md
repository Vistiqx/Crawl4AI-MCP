*** THIS IS NOT A FUNCTIONAL MCP ***
- IT WAS A LEARNING TOOL I WOULD COME BACK TO WHEN I HAD SPARE TIME

# Crawl4AI MCP Server

An MCP (Model-Controller-Processor) Server for intelligent web crawling and AI-powered content analysis. This server provides a simple API for crawling websites and processing the content using Claude AI models.

## Who Benefits from Crawl4AI?

Crawl4AI is designed for individuals and organizations who need targeted, in-depth analysis of specific web content. Unlike general search engines or AI assistants that provide broad coverage, Crawl4AI offers deeper insights into content you specifically want to analyze.

### Ideal for:

* **Researchers** who need to extract structured information from specific websites or academic resources
* **Content creators** looking to analyze competitor content or industry trends within specific domains
* **Data analysts** who need to process web data for business intelligence purposes
* **Developers** building applications that require web content analysis capabilities
* **Digital marketers** analyzing industry websites, blogs, or competitor content
* **Business analysts** gathering industry-specific information from multiple sources
* **Knowledge workers** who need to synthesize information from specific web domains

### How Users Benefit from Crawl4AI

The Crawl4AI MCP server provides significant advantages over general-purpose search and AI tools:

* **Targeted depth over breadth**: Instead of broad surface-level results across the entire web, get comprehensive analysis of specific websites that matter to you
* **Customizable crawling parameters**: Control exactly how deep to crawl, what content to extract, and how to process it
* **Programmatic integration**: Easily incorporate web content analysis into your own applications, workflows, and data pipelines
* **Flexible AI processing**: Apply different analytical approaches to the same content - summarize, extract facts, deep analysis, or generate questions
* **Privacy and control**: Keep sensitive searches and analyses private by running the server locally
* **Cost efficiency**: Use your own Claude API key with precise control over token usage and processing costs
* **Automation potential**: Schedule regular crawls and analyses of important websites to track changes over time
* **Customized AI prompting**: Tailor the AI analysis specifically to your needs with customized prompting
* **Content transformation**: Turn unstructured web content into structured, actionable information

Crawl4AI bridges the gap between simple web scraping and sophisticated AI analysis, enabling more targeted and meaningful extraction of insights from the web.

## Features

- Web crawling with customizable depth and content selectors
- Respects robots.txt directives
- Content extraction and processing
- AI-powered analysis of crawled content using Claude models
- Simple REST API
- Configurable via command line or environment variables
- Detailed logging

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/crawl4ai-mcp.git
   cd crawl4ai-mcp
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

## Usage

### Starting the Server

Start the server with default settings:

```
npm start
```

Or use command-line options:

```
npm start -- --port 4000 --debug
```

Available options:

- `--port <number>`: Port to run the server on (default: 3000)
- `--debug`: Enable debug logging

### API Endpoints

#### Crawl a Website

```
POST /api/crawl
```

Request body:

```json
{
  "url": "https://example.com",
  "depth": 2,
  "selector": "main",
  "aiProcessing": {
    "task": "summarize",
    "model": "claude-3-sonnet-20240229"
  }
}
```

Parameters:

- `url` (required): The URL to start crawling from
- `depth` (optional): How many levels deep to crawl (default: 1)
- `selector` (optional): CSS selector for content extraction (default: "body")
- `aiProcessing` (optional): Configuration for AI processing
  - `task`: Type of processing (summarize, extract, analyze, questions)
  - `model`: Claude model to use (default: "claude-3-sonnet-20240229")

#### Health Check

```
GET /api/healthcheck
```

Returns server status and version information.

## AI Processing Tasks

The server supports several AI processing tasks:

- `summarize`: Create a comprehensive summary of the crawled content
- `extract`: Extract factual information from the content
- `analyze`: Perform deep analysis of the content, arguments, and quality
- `questions`: Generate important questions and answers based on the content

## Configuration

You can configure the server using environment variables:

- `PORT`: Server port (default: 3000)
- `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude
- `DEBUG`: Set to "true" to enable debug logging

## Example

Crawl a website and summarize its content:

```bash
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "depth": 1,
    "aiProcessing": {
      "task": "summarize"
    }
  }'
```

## License

MIT License

## Acknowledgements

This project uses the following libraries:

- [Express](https://expressjs.com/)
- [Puppeteer](https://pptr.dev/)
- [Cheerio](https://cheerio.js.org/)
- [Winston](https://github.com/winstonjs/winston)
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript)
