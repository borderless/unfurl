import { VideoResult, VideoSnippet, Options } from '../interfaces'

export default function (result: VideoResult, options: Options): VideoSnippet {
  const {
    type,
    encodingFormat,
    dateModified,
    contentSize,
    contentUrl,
    originalUrl
  } = result as VideoResult

  return {
    type,
    encodingFormat,
    dateModified,
    contentSize,
    contentUrl,
    originalUrl
  }
}
