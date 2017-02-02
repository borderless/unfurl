import { parseExifDate } from '../support'
import { PdfSnippet } from '../interfaces'
import { ScrapeResult } from '../../scrape'

export default function (result: ScrapeResult): PdfSnippet {
  const exifData = result.exifData || {}

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
