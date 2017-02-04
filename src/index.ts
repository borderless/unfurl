import { scrapeUrl, Plugin } from './scrape'
import { extract, Helper, Snippet } from './extract'

export * from './scrape'
export * from './extract'

/**
 * Extract the rich snippet from a URL (short-hand testing method).
 */
export function scrapeAndExtract (url: string, plugin?: Plugin, helpers?: Helper[]): Promise<Snippet> {
  return scrapeUrl(url, plugin).then(result => extract(result, helpers))
}
