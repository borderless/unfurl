import { ScrapeResult, VideoSnippet, ExifData } from '../interfaces'

export default function (result: ScrapeResult<ExifData>): VideoSnippet {
  const {
    encodingFormat,
    contentSize,
    contentUrl
  } = result

  return {
    type: 'video',
    encodingFormat,
    contentSize,
    contentUrl
  }
}
