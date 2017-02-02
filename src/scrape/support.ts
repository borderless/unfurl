import { request, createTransport, jar } from 'popsicle'
import { Readable } from 'stream'
import { exec } from 'exiftool2'

/**
 * Exifdata as an object.
 */
export interface ExifData {
  MIMEType?: string
  Format?: string
  PageCount?: number
  Producer?: string
  Author?: string
  Creator?: string
  Title?: string
  CreateDate?: string
  ModifyDate?: string
  SubSecDateTimeOriginal?: string
  DateTimeCreated?: string
  DigitalCreationDateTime?: string
  ImageWidth?: number
  ImageHeight?: number
  Make?: string
  Model?: string
  LensMake?: string
  LensModel?: string
  Software?: string
  Megapixels?: number
  Orientation?: string
}

/**
 * Extract exif data.
 */
export async function extractExifData (stream: Readable) {
  return new Promise<ExifData | undefined>((resolve) => {
    const exif = exec(['-fast', '-'])
    exif.on('exif', (exif) => resolve(exif[0]))
    exif.on('error', () => resolve(undefined))
    stream.pipe(exif)
  })
}

/**
 * HTTP headers interface.
 */
export interface Headers {
  [name: string]: string | string[]
}

/**
 * HTTP request result.
 */
export interface Response {
  url: string
  headers: Headers
  status: number
  stream: Readable
  abort: () => void
}

/**
 * Make a HTTP request for data.
 */
export async function makeRequest (url: string): Promise<Response> {
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
