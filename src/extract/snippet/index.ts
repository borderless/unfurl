import html from './html'
import image from './image'
import pdf from './pdf'
import video from './video'

import { Snippet } from '../interfaces'
import { ScrapeResult } from '../../scrape'

export default function (result: ScrapeResult): Snippet {
  const encoding = result.encodingFormat || ''

  if (encoding === 'text/html') {
    return html(result)
  }

  if (encoding === 'application/pdf') {
    return pdf(result)
  }

  if (/^image\//.test(encoding)) {
    return image(result)
  }

  if (/^video\//.test(encoding)) {
    return video(result)
  }

  return {
    type: 'link',
    url: result.url,
    encodingFormat: result.encodingFormat
  }
}
