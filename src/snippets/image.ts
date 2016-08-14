import { parse } from 'exif-date'
import { ImageResult, Options, ImageSnippet } from '../interfaces'

export default function (result: ImageResult, options: Options): ImageSnippet {
  const {
    type,
    dateModified,
    encodingFormat,
    contentSize,
    contentUrl,
    originalUrl,
    exifData
  } = result as ImageResult

  return {
    type,
    encodingFormat: exifData.MIMEType || exifData.Format || encodingFormat,
    dateModified: parse(exifData.ModifyDate) || dateModified,
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
