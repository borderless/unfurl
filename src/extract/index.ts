import { Snippet, Helper } from './interfaces'
import { ScrapeResult } from '../scrape'
import * as helpers from './helpers'
import snippet from './snippet'

export * from './interfaces'
export { helpers }

/**
 * Simple wrapper for using the built-in extract helpers.
 */
export function extract (result: ScrapeResult, helpers: Helper[] = []): Promise<Snippet> {
  const extracted = snippet(result)

  return helpers.reduce((p, helper) => p.then(snippet => helper(snippet, result)), Promise.resolve(extracted))
}
