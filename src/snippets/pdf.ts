import { parse } from 'exif-date'
import { ScrapeResult, PdfSnippet, ExtractOptions } from '../interfaces'

export default function (result: ScrapeResult, options: ExtractOptions): PdfSnippet {
  const {
    encodingFormat,
    contentSize,
    contentUrl,
    exifData
  } = result

  return {
    type: 'pdf',
    encodingFormat,
    contentSize,
    contentUrl,
    pageCount: exifData.PageCount,
    producer: exifData.Producer,
    author: exifData.Author,
    creator: exifData.Creator,
    title: exifData.Title,
    dateCreated: parse(exifData.CreateDate),
    dateModified: parse(exifData.ModifyDate)
  }
}
