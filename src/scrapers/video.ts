import { Readable } from 'stream'
import Promise = require('any-promise')
import { Headers, AbortFn, ScrapeResult, ScrapeOptions } from '../interfaces'

export function supported ({ encodingFormat }: ScrapeResult) {
  return /^video\//.test(encodingFormat)
}

export function handle (
  result: ScrapeResult,
  headers: Headers,
  stream: Readable,
  abort: AbortFn,
  options: ScrapeOptions
): Promise<ScrapeResult> {
  result.type = 'video'

  return options.extractExifData(result.contentUrl, stream, abort)
    .then(
      (exifData) => {
        result.exifData = exifData

        return result
      },
      () => result
    )
}
