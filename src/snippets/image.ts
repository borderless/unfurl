import { parse } from 'exif-date'
import { ScrapeResult, Options, ImageSnippet } from '../interfaces'

export default function (result: ScrapeResult, options: Options): ImageSnippet {
  const {
    encodingFormat,
    contentSize,
    contentUrl,
    originalUrl,
    exifData
  } = result

  return {
    type: 'image',
    encodingFormat: exifData.MIMEType || exifData.Format || encodingFormat,
    dateModified: parse(exifData.ModifyDate),
    dateCreated: parse(exifData.DateTimeCreated) || parse(exifData.DigitalCreationDateTime),
    contentSize,
    contentUrl,
    originalUrl,
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
