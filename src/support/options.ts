import { request, createTransport, jar } from 'popsicle'
import concatStream = require('concat-stream')
import { Readable } from 'stream'
import { exec } from 'exiftool2'
import { parse } from 'exif-date'
import { AbortFn, ExifData, RequestResult } from '../interfaces'

/**
 * Extract exif data.
 */
export async function extractExifData (_url: string, stream: Readable, abort: AbortFn) {
  return new Promise<ExifData>((resolve) => {
    const exif = exec(['-fast', '-'])

    exif.on('exif', (exif) => {
      abort()

      return resolve(exif[0])
    })

    exif.on('error', () => {
      abort()

      return resolve({})
    })

    stream.pipe(exif)
  })
}

/**
 * Make a HTTP request for data.
 */
export async function makeRequest (url: string): Promise<RequestResult> {
  const req = request({
    url,
    headers: {
      'User-Agent': 'Scrappy-LinkExpanding 1.0 (+https://github.com/blakeembrey/node-scrappy)'
    },
    use: [],
    transport: createTransport({ type: 'stream', jar: jar() })
  })

  return req.then((res) => {
    // Abort wrapper to ignore streaming errors from aborting (e.g. unzipping).
    function abort () {
      res.body.on('error', () => undefined)
      req.abort()
    }

    return {
      stream: res.body,
      headers: res.headers,
      status: res.status,
      abort: abort,
      url: res.url
    }
  })
}

/**
 * Concatenate a stream.
 */
export async function concat (stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    stream.on('error', reject)

    stream.pipe(concatStream({ encoding: 'buffer' }, (data) => resolve(data)))
  })
}

/**
 * Parse an EXIF date.
 */
export function parseExifDate (value: string | undefined) {
  return value ? parse(value) : undefined
}
