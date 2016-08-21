import Promise = require('any-promise')

import html from './html'
import image from './image'
import video from './video'
import link from './link'
import pdf from './pdf'

import { ScrapeResult, Options, Snippet } from '../interfaces'

/**
 * Extraction interface.
 */
export type Extract = (result: ScrapeResult, options: Options) => Snippet | Promise<Snippet>

/**
 * Extract interfaces.
 */
export interface Extracts {
  [type: string]: Extract
}

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
