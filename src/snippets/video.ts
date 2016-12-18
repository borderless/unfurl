import { VideoResult, VideoSnippet } from '../interfaces'

export default function (result: VideoResult): VideoSnippet {
  return {
    type: 'video',
    url: result.url,
    encodingFormat: result.encodingFormat
  }
}
