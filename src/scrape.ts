import Promise = require('any-promise')
import status = require('popsicle-status')
import extend = require('xtend')
import { get, jar, createTransport } from 'popsicle'
import { Readable } from 'stream'
import { parse } from 'content-type'
import { Headers, AbortFn, BaseInfo, Result, Options } from './interfaces'
import rules from './rules'
import { DEFAULT_OPTIONS } from './utils'

/**
 * Scrape metadata from a URL.
 */
export function scrapeUrl (url: string, options?: Options): Promise<Result> {
  const req = get({
    url,
    headers: {
      'User-Agent': 'Scrappy-LinkExpanding 1.0 (+https://github.com/blakeembrey/node-scrappy)'
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

      return scrapeStream(url, res.url, res.headers, res.body, abort, options)
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
  opts?: Options
): Promise<Result> {
  const options = extend(DEFAULT_OPTIONS, opts)
  const encodingFormat = headers['content-type'] ? parse(headers['content-type']).type : undefined
  const contentLength = Number(headers['content-length'])
  const contentSize = isFinite(contentLength) ? contentLength : undefined
  const lastModified = new Date(headers['last-modified'] as string)
  const dateModified = isFinite(lastModified.getTime()) ? lastModified : undefined
  const close = abort || (() => stream.resume())

  const base: BaseInfo = { contentUrl, originalUrl, encodingFormat, contentSize, dateModified }

  for (const rule of rules) {
    if (rule.supported(base, headers)) {
      return Promise.resolve(rule.handle(base, headers, stream, close, options))
    }
  }

  // Abort unhandled types.
  close()

  return Promise.resolve(extend(base, { type: 'link' as 'link' }))
}
