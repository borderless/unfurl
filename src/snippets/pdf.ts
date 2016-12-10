import { parseExifDate } from '../support'
import { ScrapeResult, PdfSnippet, ExifData } from '../interfaces'

export default function (result: ScrapeResult<ExifData>): PdfSnippet {
  const {
    encodingFormat,
    contentSize,
    contentUrl,
    content
  } = result

  return {
    type: 'pdf',
    encodingFormat,
    contentSize,
    contentUrl,
    pageCount: content.PageCount,
    producer: content.Producer,
    author: content.Author,
    creator: content.Creator,
    title: content.Title,
    dateCreated: parseExifDate(content.CreateDate),
    dateModified: parseExifDate(content.ModifyDate)
  }
}
