import Promise = require('any-promise')
import { Readable } from 'stream'
import { Headers, AbortFn, ScrapeResult, Options } from '../interfaces'

export function supported ({ encodingFormat }: ScrapeResult) {
  return encodingFormat === 'application/pdf'
}

export function handle (
  result: ScrapeResult,
  headers: Headers,
  stream: Readable,
  abort: AbortFn,
  options: Options
): Promise<ScrapeResult> {
  result.type = 'pdf'

  return options.extractExifData(result.contentUrl, stream, abort)
    .then(
      (exifData) => {
        result.exifData = exifData

        return result
      },
      () => result
    )
}
