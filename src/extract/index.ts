import { Snippet, ExtractOptions } from './interfaces'
import { scrapeUrl, ScrapeResult } from '../scrape'

import html from './snippets/html'
import image from './snippets/image'
import pdf from './snippets/pdf'
import video from './snippets/video'

export * from './interfaces'

/**
 * Extract rich snippets from the scraping result.
 */
export async function extract (result: ScrapeResult, options: ExtractOptions = {}): Promise<Snippet> {
  const encoding = result.encodingFormat || ''

  if (encoding === 'text/html') {
    return html(result, options)
  }

  if (encoding === 'application/pdf') {
    return pdf(result)
  }

  if (/^image\//.test(encoding)) {
    return image(result)
  }

  if (/^video\//.test(encoding)) {
    return video(result)
  }

  return {
    url: result.url,
    encodingFormat: result.encodingFormat
  }
}

/**
 * Extract the rich snippet from a URL.
 */
export function extractFromUrl (url: string, options?: ExtractOptions): Promise<Snippet> {
  return scrapeUrl(url).then(res => extract(res, options))
}
