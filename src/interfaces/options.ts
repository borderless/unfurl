import { Readable } from 'stream'
import { Snippet } from './snippets'
import { BaseResult, Result } from './results'

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
  scrapers?: Scraper[]
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
 * Format for detecting support for scraping information.
 */
export interface Scraper {
  supported (result: BaseResult, headers: Headers): boolean
  handle (
    result: BaseResult,
    stream: Readable,
    abort: AbortFn,
    options: ScrapeOptions
  ): Result | Promise<Result>
}

/**
 * Interface to extract information from the scraped content.
 */
export type Extract = (result: Result, options: ExtractOptions) => undefined | Snippet | Promise<Snippet>

/**
 * Map of methods for extracting.
 */
export interface Extracts {
  [type: string]: Extract
}
