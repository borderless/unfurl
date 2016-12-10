import Promise = require('any-promise')
import { Readable } from 'stream'
import { parse } from 'content-type'
import defaultScrapers from './scrapers'
import { Headers, AbortFn, ScrapeResult, ScrapeOptions } from './interfaces'
import { makeRequest as defaultMakeRequest } from './support'

/**
 * Scrape metadata from a URL.
 */
export function scrapeUrl (url: string, options: ScrapeOptions = {}): Promise<ScrapeResult<any>> {
  const makeRequest = options.makeRequest || defaultMakeRequest

  return makeRequest(url).then(res => {
    return scrapeStream(res.url, res.headers, res.stream, res.abort, options)
  })
}

/**
 * Scrape metadata from a stream (with headers/URL).
 */
export function scrapeStream (
  contentUrl: string,
  headers: Headers,
  stream: Readable,
  abort?: AbortFn,
  options: ScrapeOptions = {}
): Promise<ScrapeResult<any>> {
  const encodingFormat = headers['content-type'] ? parse(headers['content-type']).type : undefined
  const contentLength = Number(headers['content-length'])
  const contentSize = isFinite(contentLength) ? contentLength : undefined
  const close = abort || (() => stream.resume())
  const scrapers = options.scrapers || defaultScrapers

  const result: ScrapeResult<null> = {
    type: 'link',
    content: null,
    contentUrl,
    encodingFormat,
    contentSize
  }

  // Traverse the available scrapers to extract information.
  for (const rule of scrapers) {
    if (rule.supported(result, headers)) {
      return Promise.resolve(rule.handle(result, headers, stream, close, options))
    }
  }

  // Abort unhandled types.
  close()

  return Promise.resolve(result)
}
