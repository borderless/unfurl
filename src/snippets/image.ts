import { parseExifDate } from '../support'
import { ScrapeResult, ImageSnippet, ExifData } from '../interfaces'

export default function (result: ScrapeResult<ExifData>): ImageSnippet {
  const {
    encodingFormat,
    contentSize,
    contentUrl,
    content
  } = result

  return {
    type: 'image',
    encodingFormat: content.MIMEType || content.Format || encodingFormat,
    dateModified: parseExifDate(content.ModifyDate),
    dateCreated: parseExifDate(content.SubSecDateTimeOriginal) ||
      parseExifDate(content.DateTimeCreated) ||
      parseExifDate(content.DigitalCreationDateTime),
    contentSize,
    contentUrl,
    width: content.ImageWidth,
    height: content.ImageHeight,
    make: content.Make,
    model: content.Model,
    lensMake: content.LensMake,
    lensModel: content.LensModel,
    software: content.Software,
    megapixels: content.Megapixels,
    orientation: content.Orientation
  }
}
