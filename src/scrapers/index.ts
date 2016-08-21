import * as html from './html'
import * as image from './image'
import * as video from './video'
import * as pdf from './pdf'

import { Rule } from '../interfaces'

/**
 * List of rules, executes against first match.
 */
const rules: Rule[] = [
  html,
  image,
  video,
  pdf
]

export default rules
