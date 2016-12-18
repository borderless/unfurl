import { Readable } from 'stream'
import { parse } from 'content-type'
import defaultScrapers from './scrapers'
import { Headers, AbortFn, Result, ScrapeOptions, BaseResult } from './interfaces'
import { makeRequest as defaultMakeRequest } from './support'

/**
 * Scrape metadata from a URL.
 */
export async function scrapeUrl (url: string, options: ScrapeOptions = {}): Promise<Result> {
  const makeRequest = options.makeRequest || defaultMakeRequest
  const res = await makeRequest(url)

  return scrapeStream(res.url, res.status, res.headers, res.stream, res.abort, options)
}

/**
 * Scrape metadata from a stream (with headers/URL).
 */
export async function scrapeStream (
  url: string,
  status: number,
  headers: Headers,
  stream: Readable,
  abort?: AbortFn,
  options: ScrapeOptions = {}
): Promise<Result> {
  const encodingFormat = headers['content-type'] ? parse(headers['content-type']).type : undefined
  const close = abort || (() => stream.resume())
  const scrapers = options.scrapers || defaultScrapers

  const base: BaseResult = {
    url,
    status,
    headers,
    encodingFormat
  }

  // Traverse the available scrapers to extract information.
  for (const rule of scrapers) {
    if (rule.supported(base, headers)) {
      return rule.handle(base, stream, close, options)
    }
  }

  // Abort unhandled types.
  close()

  return base
}
