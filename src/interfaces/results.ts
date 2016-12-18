import {
  ResultJsonLd,
  ResultApplinks,
  ResultDublinCore,
  ResultHtml,
  ResultSailthru,
  ResultTwitter,
  Icon,
  Alternative
} from 'htmlmetaparser'

import { Headers } from './options'
import { ExifData } from './formats'

export interface BaseResult {
  type?: string
  url: string
  status: number
  headers: Headers
  encodingFormat?: string
}

export interface HtmlResult extends BaseResult {
  type: 'html'
  jsonld?: ResultJsonLd
  rdfa?: ResultJsonLd
  microdata?: ResultJsonLd
  twitter?: ResultTwitter
  html?: ResultHtml
  dublincore?: ResultDublinCore
  applinks?: ResultApplinks
  sailthru?: ResultSailthru
  icons: Array<Icon>
  alternate: Array<Alternative>
  oembed?: any
}

export interface ImageResult extends BaseResult {
  type: 'image'
  exifData: ExifData
}

export interface VideoResult extends BaseResult {
  type: 'video'
  exifData: ExifData
}

export interface PdfResult extends BaseResult {
  type: 'pdf'
  exifData: ExifData
}

export type Result = HtmlResult | ImageResult | VideoResult | PdfResult | BaseResult
