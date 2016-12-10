import defaultSnippets from './snippets'
import { scrapeUrl } from './scrape'
import { ScrapeResult, Snippet, ScrapeOptions, ExtractOptions } from './interfaces'

/**
 * Extract rich snippets from the scraping result.
 */
export async function extract (result: ScrapeResult<any>, options: ExtractOptions = {}): Promise<Snippet | undefined> {
  if (result == null) {
    return
  }

  const snippets = options.snippets || defaultSnippets
  const extract = snippets[result.type]

  if (extract) {
    return extract(result, options)
  }

  return
}

/**
 * Extract the rich snippet from a URL.
 */
export function extractFromUrl (url: string, options?: ScrapeOptions & ExtractOptions): Promise<Snippet> {
  return scrapeUrl(url, options).then(res => extract(res, options))
}
