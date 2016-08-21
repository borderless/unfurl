import { ScrapeResult, PdfSnippet, Options } from '../interfaces'

export default function (result: ScrapeResult, options: Options): PdfSnippet {
  const {
    encodingFormat,
    contentSize,
    contentUrl,
    originalUrl,
    exifData
  } = result

  return {
    type: 'pdf',
    encodingFormat,
    contentSize,
    contentUrl,
    originalUrl,
    pageCount: exifData.PageCount,
    producer: exifData.Producer,
    creator: exifData.Creator
  }
}
