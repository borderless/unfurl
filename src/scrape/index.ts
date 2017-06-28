import { Readable } from 'stream'
import { parse } from 'content-type'
import { ScrapeResult, Plugin } from './interfaces'
import { makeRequest, Response } from './support'

import * as plugins from './plugins'

export { plugins }
export * from './interfaces'

export const DEFAULT_SCRAPER = compose([plugins.exifData, plugins.html])

/**
 * Scrape metadata from a URL.
 */
export async function scrapeUrl (url: string, plugin?: Plugin): Promise<ScrapeResult> {
  const res = await makeRequest(url)

  return scrapeResponse(res, plugin)
}

/**
 * Normalize and scrape a HTTP response object.
 */
export async function scrapeResponse (res: Response, plugin?: Plugin) {
  const { url, headers } = res
  const encodingFormat = headers['content-type'] ? parse(String(headers['content-type'])).type : undefined
  const contentSize = Number(headers['content-length']) || undefined

  return scrapeStream(res.stream, { url, encodingFormat, contentSize }, res.abort, plugin)
}

/**
 * Scrape metadata from a stream (with headers/URL).
 */
export async function scrapeStream (stream: Readable, input: ScrapeResult, abort?: () => void, plugin = DEFAULT_SCRAPER): Promise<ScrapeResult> {
  const result = await plugin(stream, Object.assign({}, input), function done (stream) {
    stream.resume() // Discard output.

    return Promise.resolve(input)
  })

  // Abort when all processing has completed.
  if (abort) {
    abort()
  }

  return result
}

/**
 * Compose a stack a plugins to execute.
 */
export function compose (middleware: Plugin[]): Plugin {
  return function plugin (stream, result, done) {
    let index = -1

    function dispatch (pos: number, stream: Readable): Promise<any> {
      if (pos <= index) {
        throw new TypeError('`next(stream)` called multiple times')
      }

      index = pos

      const fn = middleware[pos] || done

      return new Promise(resolve => {
        return resolve(fn(stream, result, function next (stream) {
          return dispatch(pos + 1, stream)
        }))
      })
    }

    return dispatch(0, stream)
  }
}
