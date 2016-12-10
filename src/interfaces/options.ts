import { Readable } from 'stream'
import Promise = require('any-promise')
import { Snippet } from './snippets'

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
 * HTTP request result.
 */
export interface RequestResult {
  url: string
  headers: Headers
  status: number
  stream: Readable
  abort: AbortFn
}

/**
 * Content scraping options.
 */
export interface ScrapeOptions {
  scrapers?: Scraper<any>[]
  useOEmbed?: boolean
  fallbackOnFavicon?: boolean
  makeRequest? (url: string): Promise<RequestResult>
  extractExifData? (url: string, stream: Readable, abort: AbortFn): Promise<any>
}

/**
 * Content extraction options.
 */
export interface ExtractOptions {
  snippets?: Extracts
  preferredIconSize?: number
  makeRequest? (url: string): Promise<RequestResult>
  extractExifData? (url: string, stream: Readable, abort: AbortFn): Promise<any>
}

/**
 * Re-used base interface for scraped and extracted information.
 */
export interface ScrapeResult <T extends any> {
  type: 'html' | 'image' | 'video' | 'pdf' | 'link' | string
  content: T
  contentUrl: string
  contentSize?: number
  encodingFormat?: string
}

/**
 * Format for detecting support for scraping information.
 */
export interface Scraper <T> {
  supported (result: ScrapeResult<any>, headers: Headers): boolean
  handle (
    result: ScrapeResult<any>,
    headers: Headers,
    stream: Readable,
    abort: AbortFn,
    options: ScrapeOptions
  ): ScrapeResult<T> | Promise<ScrapeResult<T>>
}

/**
 * Interface to extract information from the scraped content.
 */
export type Extract = (result: ScrapeResult<any>, options: ExtractOptions) => undefined | Snippet | Promise<Snippet>

/**
 * Map of methods for extracting.
 */
export interface Extracts {
  [type: string]: Extract
}
