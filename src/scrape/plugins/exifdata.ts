import { Readable, PassThrough } from 'stream'
import { ScrapeResult, Next } from '../interfaces'
import { extractExifData, ExifData } from '../support'

declare module '../interfaces' {
  interface ScrapeResult {
    exifData?: ExifData
  }
}

export default async function (
  stream: Readable,
  result: ScrapeResult,
  next: Next
): Promise<ScrapeResult> {
  const [exifdata] = await Promise.all([
    extractExifData(stream),
    next(stream.pipe(new PassThrough()))
  ])

  result.exifData = exifdata

  return result
}
