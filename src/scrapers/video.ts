import { Readable } from 'stream'
import { AbortFn, BaseResult, ScrapeOptions, VideoResult } from '../interfaces'
import { extractExifData as defaultExtractExifData } from '../support'

export function supported ({ encodingFormat }: BaseResult) {
  return !!encodingFormat && /^video\//.test(encodingFormat)
}

export async function handle (
  base: BaseResult,
  stream: Readable,
  abort: AbortFn,
  options: ScrapeOptions
): Promise<VideoResult> {
  const extractExifData = options.extractExifData || defaultExtractExifData
  const exifData = await extractExifData(base.url, stream, abort)

  const result: VideoResult = Object.assign(
    {
      type: 'video' as 'video',
      exifData
    },
    base
  )

  return result
}
