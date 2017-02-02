import { Readable } from 'stream'

/**
 * Plugin types.
 */
export type Next = (stream: Readable) => Promise<ScrapeResult>
export type Plugin = (stream: Readable, result: ScrapeResult, next: Next) => Promise<ScrapeResult>

/**
 * Type to augment for scrape results.
 */
export interface ScrapeResult {
  url: string
  encodingFormat?: string
  contentSize?: number
}
