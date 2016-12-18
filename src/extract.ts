import defaultSnippets from './snippets'
import { scrapeUrl } from './scrape'
import { Result, Snippet, ScrapeOptions, ExtractOptions } from './interfaces'

/**
 * Extract rich snippets from the scraping result.
 */
export async function extract (result: Result, options: ExtractOptions = {}): Promise<Snippet | undefined> {
  if (result == null) {
    return
  }

  const snippets = options.snippets || defaultSnippets

  if (result.type == null || !snippets[result.type]) {
    return {
      url: result.url,
      encodingFormat: result.encodingFormat
    }
  }

  return snippets[result.type](result, options)
}

/**
 * Extract the rich snippet from a URL.
 */
export function extractFromUrl (url: string, options?: ScrapeOptions & ExtractOptions): Promise<Snippet> {
  return scrapeUrl(url, options).then(res => extract(res, options))
}
