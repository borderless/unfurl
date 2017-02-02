import { ImageSnippet } from '../interfaces'
import { parseExifDate } from '../support'
import { ScrapeResult } from '../../scrape'

export default function (result: ScrapeResult): ImageSnippet {
  const exifData = result.exifData || {}

  return {
    type: 'image',
    encodingFormat: exifData.MIMEType || exifData.Format || result.encodingFormat,
    dateModified: parseExifDate(exifData.ModifyDate),
    dateCreated: parseExifDate(exifData.SubSecDateTimeOriginal) ||
      parseExifDate(exifData.DateTimeCreated) ||
      parseExifDate(exifData.DigitalCreationDateTime),
    url: result.url,
    width: exifData.ImageWidth,
    height: exifData.ImageHeight,
    make: exifData.Make,
    model: exifData.Model,
    lensMake: exifData.LensMake,
    lensModel: exifData.LensModel,
    software: exifData.Software,
    megapixels: exifData.Megapixels,
    orientation: exifData.Orientation
  }
}
