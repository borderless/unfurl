import Promise = require('any-promise')
import { Readable } from 'stream'
import { Headers, AbortFn, ScrapeResult, ScrapeOptions } from '../interfaces'

export function supported ({ encodingFormat }: ScrapeResult) {
  return /^image\//.test(encodingFormat)
}

export function handle (
  result: ScrapeResult,
  headers: Headers,
  stream: Readable,
  abort: AbortFn,
  options: ScrapeOptions
): Promise<ScrapeResult> {
  result.type = 'image'

  return options.extractExifData(result.contentUrl, stream, abort)
    .then(
      (exifData) => {
        result.exifData = exifData

        return result
      },
      () => result
    )
}
