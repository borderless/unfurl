import { Readable } from 'stream'
import Promise = require('any-promise')
import { ScrapeResult } from './scrape'
import { Snippet } from './snippet'

/**
 * HTTP headers interface.
 */
export interface Headers {
  [name: string]: string | string[]
}

/**
 * Efficiently abort the data stream.
 */
export type AbortFn = () => void

/**
 * Content scraping options.
 */
export interface ScrapeOptions {
  scrapers?: Scraper[]
  userAgent?: string
  useOEmbed?: boolean
  fallbackOnFavicon?: boolean
  extractExifData? (url: string, stream: Readable, abort: AbortFn): Promise<any>
}

/**
 * Content extraction options.
 */
export interface ExtractOptions {
  snippets?: Extracts
  preferredIconSize?: number
  extractExifData? (url: string, stream: Readable, abort: AbortFn): Promise<any>
}

/**
 * Re-used base interface for scraped and extracted information.
 */
export interface Base {
  type: 'html' | 'image' | 'video' | 'pdf' | 'link' | string
  contentUrl: string
  contentSize?: number
  encodingFormat?: string
}

/**
 * Format for detecting support for scraping information.
 */
export interface Scraper {
  supported (result: ScrapeResult, headers: Headers): boolean
  handle (
    result: ScrapeResult,
    headers: Headers,
    stream: Readable,
    abort: AbortFn,
    options: ScrapeOptions
  ): ScrapeResult | Promise<ScrapeResult>
}

/**
 * Interface to extract information from the scraped content.
 */
export type Extract = (result: ScrapeResult, options: ExtractOptions) => Snippet | Promise<Snippet>

/**
 * Map of methods for extracting.
 */
export interface Extracts {
  [type: string]: Extract
}
