import html from './html'
import image from './image'
import video from './video'
import link from './link'
import pdf from './pdf'

import { Extracts } from '../interfaces'

/**
 * Map of snippet creation methods.
 */
const extracts: Extracts = {
  html,
  image,
  video,
  link,
  pdf
}

export default extracts
