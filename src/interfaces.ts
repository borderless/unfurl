import Promise = require('any-promise')
import { Readable } from 'stream'

export interface Headers {
  [name: string]: string | string[]
}

export type AbortFn = () => void

export interface ResultMeta {
  html?: HtmlMeta
  twitter?: TwitterMeta
  sailthru?: SailthruMeta
  dc?: DublinCoreMeta
  jsonLd?: JsonLdMeta
  rdfa?: RdfaMeta
  applinks?: AppLinksMeta
  microdata?: MicrodataMeta | MicrodataMeta[]
}

export interface BaseResult {
  contentUrl: string
  contentSize?: number
  encodingFormat?: string
  dateModified?: Date
  meta?: ResultMeta
}

export interface ImageResult extends BaseResult {
  type: 'image'
}

export interface VideoResult extends BaseResult {
  type: 'video'
}

export interface HtmlResult extends BaseResult {
  type: 'html'
}

export type Result = ImageResult | VideoResult | HtmlResult

export interface HtmlMeta {
  title?: string
  description?: string
  author?: string
  tags?: string // "*,*,..."
  language?: string
  canonical?: string
  date?: string // Date
  [key: string]: string | void
}

export interface TwitterMeta {
  card?: string
  site?: string
  'site:id'?: string
  creator?: string
  'creator:id'?: string
  description?: string
  title?: string
  image?: string
  'image:alt'?: string
  player?: string
  'player:width'?: string
  'player:height'?: string
  'player:stream'?: string
  'app:name:iphone'?: string
  'app:id:iphone'?: string
  'app:url:iphone'?: string
  'app:name:ipad'?: string
  'app:id:ipad'?: string
  'app:url:ipad'?: string
  'app:name:googleplay'?: string
  'app:id:googleplay'?: string
  'app:url:googleplay'?: string
  [key: string]: string | void
}

export interface DublinCoreMeta {
  title?: string
  date?: string // Date
  'date.issued'?: string // Date
  'date.modified'?: string // Date
  [key: string]: string | void
}

export interface SailthruMeta {
  title?: string
  description?: string
  author?: string
  tags?: string // "*,*,..."
  date?: string // Date
  expire_date?: string
  'image.full'?: string
  'image.thumb'?: string
  location?: string // "lat,long"
  price?: string // number
  [key: string]: string | void
}

export interface RdfaMeta {
  [subject: string]: {
    [predicate: string]: string | string[]
  }
}

export interface JsonLdMeta {
  [key: string]: any
}

export interface MicrodataMeta {
  [key: string]: string | string[] | MicrodataMeta
}

export interface AppLinksMeta {
  'al:ios:url'?: string
  'al:ios:app_store_id'?: string
  'al:ios:app_name'?: string
  'al:iphone:url'?: string
  'al:iphone:app_store_id'?: string
  'al:iphone:app_name'?: string
  'al:ipad:url'?: string
  'al:ipad:app_store_id'?: string
  'al:ipad:app_name'?: string
  'al:android:url'?: string
  'al:android:package'?: string
  'al:android:class'?: string
  'al:android:app_name'?: string
  'al:windows_phone:url'?: string
  'al:windows_phone:app_id'?: string
  'al:windows_phone:app_name'?: string
  'al:windows:url'?: string
  'al:windows:app_id'?: string
  'al:windows:app_name'?: string
  'al:windows_universal:url'?: string
  'al:windows_universal:app_id'?: string
  'al:windows_universal:app_name'?: string
  'al:web:url'?: string
  'al:web:should_fallback'?: string
  [key: string]: string | void
}

export interface Rule {
  supported (url: string, headers: Headers): boolean
  handle (url: string, headers: Headers, stream: Readable, abort: AbortFn): Result | Promise<Result>
}
