import { ScrapeResult, VideoSnippet, Options } from '../interfaces'

export default function (result: ScrapeResult, options: Options): VideoSnippet {
  const {
    encodingFormat,
    contentSize,
    contentUrl,
    originalUrl
  } = result

  return {
    type: 'video',
    encodingFormat,
    contentSize,
    contentUrl,
    originalUrl
  }
}
