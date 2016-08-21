import { Readable } from 'stream'
import Promise = require('any-promise')
import { ScrapeResult } from './scrape'

export interface Headers {
  [name: string]: string | string[]
}

export type AbortFn = () => void

export interface Options {
  useOEmbed?: boolean
  userAgent?: string
  fallbackOnFavicon?: boolean
  preferredIconSize?: number
  extractImageSizes?: boolean
  extractExifData? (url: string, stream: Readable, abort: AbortFn): Promise<any>
}

export interface Base {
  type: 'html' | 'image' | 'video' | 'pdf' | 'link'
  originalUrl: string
  contentUrl: string
  contentSize?: number
  encodingFormat?: string
}

export interface Rule {
  supported (result: ScrapeResult, headers: Headers): boolean
  handle (
    result: ScrapeResult,
    headers: Headers,
    stream: Readable,
    abort: AbortFn,
    options: Options
  ): ScrapeResult | Promise<ScrapeResult>
}
