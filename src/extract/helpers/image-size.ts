import { scrapeResponse } from '../../scrape'
import { Snippet, ImageSnippet } from '../interfaces'
import { Response, makeRequest as defaultMakeRequest } from '../../scrape/support'
import { extract } from '../'

export interface Options {
  makeRequest?: (url: string) => Promise<Response>
}

/**
 * Retrieve the selected snippet icon.
 */
export default function (options: Options = {}) {
  const makeRequest = options.makeRequest || defaultMakeRequest

  return async function (snippet: Snippet): Promise<Snippet> {
    if (snippet.type !== 'html' || !snippet.image) {
      return snippet
    }

    snippet.image = await Promise.all(snippet.image.map(async (image) => {
      try {
        const url = image.secureUrl || image.url
        const response = await makeRequest(url)
        const result = await scrapeResponse(response)

        return await extract(result) as ImageSnippet
      } catch (e) {
        return image // Ignore bad requests.
      }
    }))

    return snippet
  }
}
