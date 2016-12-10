import * as html from './html'
import * as image from './image'
import * as video from './video'
import * as pdf from './pdf'

import { Scraper } from '../interfaces'

/**
 * List of rules, executes against first match.
 */
const rules: Scraper<any>[] = [
  html,
  image,
  video,
  pdf
]

export default rules
