import extend = require('xtend')
import Promise = require('any-promise')
import { scrapeUrl } from './scrape'
import { DEFAULT_EXTRACT_OPTIONS } from './utils'

import snippets from './snippets'

import { ScrapeResult, Snippet, ScrapeOptions, ExtractOptions } from './interfaces'

/**
 * Extract rich snippets from the scraping result.
 */
export function extract (result: ScrapeResult, opts?: ExtractOptions): Promise<Snippet> {
  if (result == null) {
    return
  }

  const options = extend(DEFAULT_EXTRACT_OPTIONS, opts)
  const extract = snippets[result.type]

  if (extract) {
    return Promise.resolve(extract(result, options))
  }

  return Promise.resolve(undefined)
}

/**
 * Extract the rich snippet from a URL.
 */
export function extractFromUrl (url: string, options?: ScrapeOptions & ExtractOptions): Promise<Snippet> {
  return scrapeUrl(url, options).then(res => extract(res, options))
}
