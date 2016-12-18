import { Readable } from 'stream'
import { AbortFn, BaseResult, ScrapeOptions, PdfResult } from '../interfaces'
import { extractExifData as defaultExtractExifData } from '../support'

export function supported ({ encodingFormat }: BaseResult) {
  return encodingFormat === 'application/pdf'
}

export async function handle (
  base: BaseResult,
  stream: Readable,
  abort: AbortFn,
  options: ScrapeOptions
): Promise<PdfResult> {
  const extractExifData = options.extractExifData || defaultExtractExifData
  const exifData = await extractExifData(base.url, stream, abort)

  const result: PdfResult = Object.assign(
    {
      type: 'pdf' as 'pdf',
      exifData
    },
    base
  )

  return result
}
