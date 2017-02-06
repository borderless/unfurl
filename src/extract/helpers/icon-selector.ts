import { resolve } from 'url'
import { Icon } from 'htmlmetaparser'
import { ScrapeResult, scrapeResponse } from '../../scrape'
import { Snippet, ImageSnippet } from '../interfaces'
import { Response, makeRequest as defaultMakeRequest } from '../../scrape/support'
import { extract } from '../'

export interface Options {
  preferredSize?: number
  makeRequest?: (url: string) => Promise<Response>
  fallbackOnFavicon?: boolean
}

/**
 * Retrieve the selected snippet icon.
 */
export default function (options: Options = {}) {
  const makeRequest = options.makeRequest || defaultMakeRequest
  const preferredSize = options.preferredSize || 32

  return async function (snippet: Snippet, result: ScrapeResult): Promise<Snippet> {
    if (snippet.type !== 'html') {
      return snippet
    }

    const icons = result.icons || []
    let selectedImage: ImageSnippet | undefined

    if (icons.length === 0 && options.fallbackOnFavicon !== false) {
      const url = resolve(result.url, '/favicon.ico')
      const response = await makeRequest(url)
      const iconResult = await scrapeResponse(response)
      const icon = await extract(iconResult) as ImageSnippet

      return Object.assign(snippet, { icon })
    }

    for (const icon of icons) {
      const currentImage = formatIcon(icon)

      if (selectedImage) {
        const selectedWidth = selectedImage.width || Infinity
        const currentWidth = currentImage.width || Infinity

        if (Math.abs(preferredSize - currentWidth) < Math.abs(preferredSize - selectedWidth)) {
          selectedImage = currentImage
        }
      } else {
        selectedImage = currentImage
      }
    }

    return Object.assign(snippet, { icon: selectedImage })
  }
}

/**
 * Format the icon into an image snippet.
 */
function formatIcon (icon: Icon): ImageSnippet {
  const image: ImageSnippet = { type: 'image', encodingFormat: icon.type, url: icon.href }

  if (typeof icon.sizes === 'string') {
    const [width, height] = icon.sizes.split('x', 2).map(x => parseInt(x, 10)) // "32x32" -> [32, 32].

    if (width && height) {
      image.width = width
      image.height = height
    }
  }

  return image
}
