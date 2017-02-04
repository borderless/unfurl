import { VideoSnippet } from '../interfaces'
import { ScrapeResult } from '../../scrape'

export default function (result: ScrapeResult): VideoSnippet {
  return {
    type: 'video',
    url: result.url,
    encodingFormat: result.encodingFormat
  }
}
