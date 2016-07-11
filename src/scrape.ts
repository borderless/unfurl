import Promise = require('any-promise')
import status = require('popsicle-status')
import { get, jar, createTransport } from 'popsicle'
import { Readable } from 'stream'
import { Headers, AbortFn, Result, Options } from './interfaces'
import rules from './rules'

/**
 * Scrape metadata from a URL.
 */
export function scrapeUrl (url: string, options?: Options): Promise<Result> {
  const req = get({
    url,
    method: 'get',
    transport: createTransport({
      type: 'stream',
      // Some websites require the use of cookies for their log-in page, so
      // you don't get stuck in an infinite loop (looking at you, NYTimes.com).
      jar: jar()
    })
  })

  return req
    .use(status(200))
    .then(res => {
      return scrapeStream(url, res.url, res.headers, res.body, () => req.abort(), options)
    })
}

/**
 * Scrape metadata from a stream (with headers/URL).
 */
export function scrapeStream (
  originalUrl: string,
  contentUrl: string,
  headers: Headers,
  stream: Readable,
  abort?: AbortFn,
  options?: Options
): Promise<Result | void> {
  const cancel = abort || (() => stream.resume())

  for (const rule of rules) {
    if (rule.supported(contentUrl, headers)) {
      return Promise.resolve(rule.handle(originalUrl, contentUrl, headers, stream, cancel, options || {}))
    }
  }

  // Abort unhandled types.
  cancel()

  return Promise.resolve()
}
