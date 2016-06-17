import Promise = require('any-promise')
import { request, plugins, jar } from 'popsicle'
import { Readable } from 'stream'
import { Headers, AbortFn, Result } from './interfaces'
import rules from './rules'

/**
 * Scrape metadata from a URL.
 */
export function scrapeUrl (url: string): Promise<Result> {
  const req = request({
    url,
    method: 'get',
    use: [
      plugins.unzip(),
      plugins.headers()
    ],
    options: {
      // Some websites require the use of cookies for their log-in page, so
      // you don't get stuck in an infinite loop (looking at you, NYTimes.com).
      jar: jar()
    }
  })

  return req.then(response => {
    return scrapeStream(url, response.headers, response.body, () => req.abort())
  })
}

/**
 * Scrape metadata from a stream (with headers/URL).
 */
export function scrapeStream (url: string, headers: Headers, stream: Readable, abort?: AbortFn): Promise<Result> {
  for (const rule of rules) {
    if (rule.supported(url, headers)) {
      return Promise.resolve(rule.handle(url, headers, stream, abort || (() => stream.resume())))
    }
  }
}
