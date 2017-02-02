import { WritableStream } from 'htmlparser2'
import { Readable, PassThrough } from 'stream'
import { promises as Jsonld } from 'jsonld'
import { ScrapeResult, Next } from '../interfaces'

import {
  Handler,
  Result,
  ResultJsonLd,
  ResultApplinks,
  ResultDublinCore,
  ResultHtml,
  ResultSailthru,
  ResultTwitter,
  Icon,
  Alternative
} from 'htmlmetaparser'

declare module '../interfaces' {
  interface ScrapeResult {
    jsonld?: ResultJsonLd
    rdfa?: ResultJsonLd
    microdata?: ResultJsonLd
    twitter?: ResultTwitter
    html?: ResultHtml
    dublincore?: ResultDublinCore
    applinks?: ResultApplinks
    sailthru?: ResultSailthru
    icons?: Array<Icon>
    alternate?: Array<Alternative>
  }
}

export default async function (
  stream: Readable,
  result: ScrapeResult,
  next: Next
): Promise<ScrapeResult> {
  const { url } = result

  if (result.encodingFormat !== 'text/html') {
    return next(stream)
  }

  const [parsed] = await Promise.all([
    parseHtml(stream, url),
    next(stream.pipe(new PassThrough()))
  ])

  const { twitter, html, icons, dublincore, applinks, sailthru, alternate } = parsed

  const [jsonld, rdfa, microdata] = await Promise.all([
    parsed.jsonld ? Jsonld.expand(parsed.jsonld, { base: url }).catch(() => undefined) : undefined,
    parsed.rdfa ? Jsonld.expand(parsed.rdfa, { base: url }).catch(() => undefined) : undefined,
    parsed.microdata ? Jsonld.expand(parsed.microdata, { base: url }).catch(() => undefined) : undefined
  ])

  return Object.assign(result, {
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
  })
}

/**
 * Parse the HTML into a result object.
 */
function parseHtml (stream: Readable, contentUrl: string) {
  return new Promise<Result>((resolve, reject) => {
    const handler = new Handler(
      (err, result) => {
        return err ? reject(err) : resolve(result)
      },
      {
        url: contentUrl
      }
    )

    stream.pipe(new WritableStream(handler, { decodeEntities: true }))
  })
}
