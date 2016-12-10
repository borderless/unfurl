import { Readable } from 'stream'
import Promise = require('any-promise')
import { Headers, AbortFn, ScrapeResult, ScrapeOptions, ExifData } from '../interfaces'
import { extractExifData as defaultExtractExifData } from '../support'

export function supported ({ encodingFormat }: ScrapeResult<null>) {
  return !!encodingFormat && /^video\//.test(encodingFormat)
}

export function handle (
  result: ScrapeResult<ExifData>,
  _headers: Headers,
  stream: Readable,
  abort: AbortFn,
  options: ScrapeOptions
): Promise<ScrapeResult<ExifData>> {
  const extractExifData = options.extractExifData || defaultExtractExifData

  result.type = 'video'

  return extractExifData(result.contentUrl, stream, abort)
    .then(
      (exifData) => {
        result.content = exifData

        return result
      },
      () => result
    )
}
