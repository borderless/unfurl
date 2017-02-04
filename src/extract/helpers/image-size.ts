import { scrapeResponse } from '../../scrape'
import { Snippet } from '../interfaces'
import { Response, makeRequest as defaultMakeRequest } from '../../scrape/support'

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
        const response = await makeRequest(image.secureUrl || image.url)
        const { exifData } = await scrapeResponse(response)

        if (!exifData) {
          return image // Skip when we failed to get exif data.
        }

        return {
          url: image.url,
          secureUrl: image.secureUrl,
          alt: image.alt,
          type: exifData.MIMEType || image.type,
          width: exifData.ImageWidth || image.width,
          height: exifData.ImageHeight || image.height
        }
      } catch (e) {
        return image // Ignore bad requests.
      }
    }))

    return snippet
  }
}
