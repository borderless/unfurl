import { Handler, Result } from 'htmlmetaparser'
import { WritableStream } from 'htmlparser2'
import { Readable } from 'stream'
import { resolve } from 'url'
import { promises as Jsonld } from 'jsonld'
import { parse } from 'content-type'
import { makeRequest as defaultMakeRequest, concat } from '../support'

import {
  Headers,
  AbortFn,
  ScrapeResult,
  ScrapeOptions
} from '../interfaces'

/**
 * Check support for HTML.
 */
export function supported ({ encodingFormat }: ScrapeResult<null>) {
  return encodingFormat === 'text/html'
}

export async function handle (
  result: ScrapeResult<HtmlContent>,
  _headers: Headers,
  stream: Readable,
  _abort: AbortFn,
  options: ScrapeOptions
): Promise<ScrapeResult<HtmlContent>> {
  const { contentUrl } = result
  const makeRequest = options.makeRequest || defaultMakeRequest

  const parsed = await parseHtml(stream, contentUrl)
  const { twitter, html, icons, dublincore, applinks, sailthru, alternate } = parsed

  const [jsonld, rdfa, microdata] = await Promise.all([
    Jsonld.expand(parsed.jsonld || {}),
    Jsonld.expand(parsed.rdfa || {}),
    Jsonld.expand(parsed.microdata || {})
  ])

  result.type = 'html'

  result.content = {
    jsonld,
    rdfa,
    microdata,
    twitter,
    html,
    icons,
    dublincore,
    applinks,
    sailthru,
    alternate
  }

  // Attempt to read OEmbed metadata.
  if (options.useOEmbed !== false) {
    for (const alternate of result.content.alternate) {
      if (alternate.type === 'text/json+oembed') {
        const res = await makeRequest(alternate.href)

        if (res.status === 200) {
          const content = await concat(res.stream)

          try {
            result.content.oembed = JSON.parse(content.toString('utf8'))
          } catch (e) { /* Ignore parse errors. */ }
        }

        break
      }
    }
  }

  // Follow the default browser behaviour to find `favicon.ico`.
  if (options.fallbackOnFavicon !== false && result.content.icons.length === 0) {
    const href = resolve(contentUrl, '/favicon.ico')
    const res = await makeRequest(href)

    // Ignore the actual response body, it's not important.
    res.abort()

    if (res.status === 200) {
      result.content.icons.push({
        type: res.headers['content-type'] ? parse(res.headers['content-type']).type : undefined,
        href
      })
    }
  }

  return result
}

export interface HtmlContent extends Result {
  oembed?: any
}

/**
 * Parse the HTML into a result object.
 */
function parseHtml (stream: Readable, contentUrl: string) {
  return new Promise<HtmlContent>((resolve, reject) => {
    const handler = new Handler(
      (err, result: HtmlContent) => {
        return err ? reject(err) : resolve(result)
      },
      {
        url: contentUrl
      }
    )

    stream.pipe(new WritableStream(handler, { decodeEntities: true }))
  })
}
