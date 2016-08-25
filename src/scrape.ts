import Promise = require('any-promise')
import status = require('popsicle-status')
import extend = require('xtend')
import { get, jar, createTransport } from 'popsicle'
import { Readable } from 'stream'
import { parse } from 'content-type'
import { Headers, AbortFn, ScrapeResult, ScrapeOptions } from './interfaces'
import { DEFAULT_SCRAPE_OPTIONS } from './utils'

/**
 * Scrape metadata from a URL.
 */
export function scrapeUrl (url: string, opts?: ScrapeOptions): Promise<ScrapeResult> {
  const options = extend(DEFAULT_SCRAPE_OPTIONS, opts)

  const req = get({
    url,
    headers: {
      'User-Agent': options.userAgent
    },
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
      function abort () {
        // Ignore streaming errors after aborting.
        res.body.on('error', (): void => undefined)
        req.abort()
      }

      return scrapeStream(res.url, res.headers, res.body, abort, options)
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
  opts?: ScrapeOptions
): Promise<ScrapeResult> {
  const options = extend(DEFAULT_SCRAPE_OPTIONS, opts)
  const encodingFormat = headers['content-type'] ? parse(headers['content-type']).type : undefined
  const contentLength = Number(headers['content-length'])
  const contentSize = isFinite(contentLength) ? contentLength : undefined
  const close = abort || (() => stream.resume())

  const result: ScrapeResult = {
    type: 'link',
    contentUrl,
    encodingFormat,
    contentSize
  }

  // Traverse the available scrapers to extract information.
  for (const rule of options.scrapers) {
    if (rule.supported(result, headers)) {
      return Promise.resolve(rule.handle(result, headers, stream, close, options))
    }
  }

  // Abort unhandled types.
  close()

  return Promise.resolve(result)
}
