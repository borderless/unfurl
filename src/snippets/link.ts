import { ScrapeResult, LinkSnippet, Options } from '../interfaces'

export default function (result: ScrapeResult, options: Options): LinkSnippet {
  const {
    encodingFormat,
    contentSize,
    contentUrl,
    originalUrl
  } = result

  return {
    type: 'link',
    encodingFormat,
    contentSize,
    contentUrl,
    originalUrl
  }
}
