import { ScrapeResult, LinkSnippet } from '../interfaces'

export default function (result: ScrapeResult<null>): LinkSnippet {
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
