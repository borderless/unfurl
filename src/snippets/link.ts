import { LinkResult, LinkSnippet, Options } from '../interfaces'

export default function (result: LinkResult, options: Options): LinkSnippet {
  const {
    type,
    encodingFormat,
    dateModified,
    contentSize,
    contentUrl,
    originalUrl
  } = result as LinkResult

  return {
    type,
    encodingFormat,
    dateModified,
    contentSize,
    contentUrl,
    originalUrl
  }
}
