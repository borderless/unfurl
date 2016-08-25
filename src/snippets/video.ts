import { ScrapeResult, VideoSnippet, ExtractOptions } from '../interfaces'

export default function (result: ScrapeResult, options: ExtractOptions): VideoSnippet {
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
