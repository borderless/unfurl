import { Readable } from 'stream'
import { AbortFn, BaseResult, ScrapeOptions, ImageResult } from '../interfaces'
import { extractExifData as defaultExtractExifData } from '../support'

export function supported ({ encodingFormat }: BaseResult) {
  return !!encodingFormat && /^image\//.test(encodingFormat)
}

export async function handle (
  base: BaseResult,
  stream: Readable,
  abort: AbortFn,
  options: ScrapeOptions
): Promise<ImageResult> {
  const extractExifData = options.extractExifData || defaultExtractExifData
  const exifData = await extractExifData(base.url, stream, abort)

  const result: ImageResult = Object.assign(
    {
      type: 'image' as 'image',
      exifData
    },
    base
  )

  return result
}
