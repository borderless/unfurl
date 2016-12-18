import { parseExifDate } from '../support'
import { PdfResult, PdfSnippet } from '../interfaces'

export default function (result: PdfResult): PdfSnippet {
  const { exifData } = result

  return {
    type: 'pdf',
    url: result.url,
    encodingFormat: result.encodingFormat,
    pageCount: exifData.PageCount,
    producer: exifData.Producer,
    author: exifData.Author,
    creator: exifData.Creator,
    title: exifData.Title,
    dateCreated: parseExifDate(exifData.CreateDate),
    dateModified: parseExifDate(exifData.ModifyDate)
  }
}
