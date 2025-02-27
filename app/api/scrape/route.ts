// /api/scrape/route.ts
import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import fs from 'fs';
import path from 'path';
import { RESOURCES_DIR } from '@/lib/constants';

// Initialize Firecrawl with API key from environment variables
const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

/**
 * Generates a file name from a URL.
 * Uses the last path segment (slug) if available, otherwise the domain name.
 * Examples:
 * - "https://www.layerpath.com" -> "layerpath.md"
 * - "https://www.layerpath.com/resources/blog" -> "blog.md"
 * - "https://www.layerpath.com/resources/blog/interactive-demos-for-customer-success" -> "interactive-demos-for-customer-success.md"
 */
function generateFileName(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/').filter(part => part.length > 0);
    if (pathParts.length > 0) {
      return `${pathParts[pathParts.length - 1]}.md`;
    } else {
      return `${parsedUrl.hostname.split('.')[1]}.md`; // e.g., "layerpath" from "www.layerpath.com"
    }
  } catch (error) {
    console.error(`Invalid URL: ${url}`, error);
    return 'default.md'; // Fallback file name
  }
}

/**
 * POST handler for scraping URLs and saving content as markdown files.
 * Expects a JSON body with an array of URLs: { urls: string[] }
 */
export async function POST(request: Request) {
  try {
    // Ensure the resources directory exists
    if (!fs.existsSync(RESOURCES_DIR)) {
      fs.mkdirSync(RESOURCES_DIR);
    }

    // Parse and validate request body
    const { urls } = await request.json();
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected an array of URLs.' },
        { status: 400 }
      );
    }

    const filesToScrape = [];
    const existingFiles = [];

    // First check which files need to be scraped
    for (const url of urls) {
      const fileName = generateFileName(url);
      const filePath = path.join(RESOURCES_DIR, fileName);
      
      if (fs.existsSync(filePath)) {
        existingFiles.push(fileName);
      } else {
        filesToScrape.push({ url, fileName, filePath });
      }
    }

    // Only scrape URLs for files that don't exist
    for (const { url, fileName, filePath } of filesToScrape) {
      try {
        const scrapeResult = await app.scrapeUrl(url, { formats: ['markdown'] });
        if (!scrapeResult.success) {
          console.error(`Failed to scrape ${url}: ${scrapeResult.error}`);
          continue;
        }

        fs.writeFileSync(filePath, scrapeResult.markdown!);
        console.log(`Successfully saved ${url} to ${filePath}`);
      } catch (error) {
        console.error(`Error scraping ${url}:`, error);
      }
    }

    // Get list of all files after scraping is complete
    const files = fs.readdirSync(RESOURCES_DIR);

    return NextResponse.json({ 
      message: 'Scraping completed successfully.',
      directory: RESOURCES_DIR,
      files: files,
      skippedFiles: existingFiles
    });
  } catch (error) {
    console.error('Error in scrape API:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}