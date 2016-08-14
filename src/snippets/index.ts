import Promise = require('any-promise')

import html from './html'
import image from './image'
import video from './video'
import link from './link'

import { Result, Options, Snippet } from '../interfaces'

/**
 * Extraction interface.
 */
export type Extract = (result: Result, options: Options) => Snippet | Promise<Snippet>

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
  link
}

export default extracts
