import { resolve } from 'url'
import { ScrapeResult, scrapeResponse } from '../../scrape'
import { Snippet, HtmlSnippetIcon } from '../interfaces'
import { Response, makeRequest as defaultMakeRequest } from '../../scrape/support'

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
    let selectedSize: number | undefined
    let selectedIcon: HtmlSnippetIcon | undefined

    if (icons.length === 0 && options.fallbackOnFavicon !== false) {
      const href = resolve(result.url, '/favicon.ico')
      const response = await makeRequest(href)
      const { exifData } = await scrapeResponse(response)

      if (!exifData) {
        return snippet
      }

      const icon: HtmlSnippetIcon = {
        href,
        size: exifData.ImageWidth && exifData.ImageHeight ? `${exifData.ImageWidth}x${exifData.ImageHeight}` : undefined,
        type: exifData.MIMEType
      }

      return Object.assign(snippet, { icon })
    }

    for (const icon of icons) {
      if (selectedSize == null) {
        selectedIcon = icon
      }

      if (icon.sizes) {
        const size = parseInt(icon.sizes, 10) // "32x32" -> "32".

        if (selectedSize == null) {
          selectedIcon = icon
          selectedSize = size
        } else {
          if (Math.abs(preferredSize - size) < Math.abs(selectedSize - size)) {
            selectedIcon = icon
            selectedSize = size
          }
        }
      } else {
        selectedIcon = selectedIcon || icon
      }
    }

    return Object.assign(snippet, { icon: selectedIcon })
  }
}
