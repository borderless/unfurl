import { ScrapeResult, LinkSnippet, ExtractOptions } from '../interfaces'

export default function (result: ScrapeResult, options: ExtractOptions): LinkSnippet {
  const {
    encodingFormat,
    contentSize,
    contentUrl
  } = result

  return {
    type: 'link',
    encodingFormat,
    contentSize,
    contentUrl
  }
}
