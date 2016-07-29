import Promise = require('any-promise')
import { Readable } from 'stream'

/**
 * Programmatic interfaces.
 */
export interface Headers {
  [name: string]: string | string[]
}

export type AbortFn = () => void

export interface Options {
  useOEmbed?: boolean
  fallbackOnFavicon?: boolean
  preferredIconSize?: number
  extractExifData? (url: string, stream: Readable, abort: AbortFn): Promise<any>
}

export interface Rule {
  supported (base: BaseInfo, headers: Headers): boolean
  handle (
    base: BaseInfo,
    headers: Headers,
    stream: Readable,
    abort: AbortFn,
    options: Options
  ): Result | Promise<Result>
}

/**
 * Metadata.
 */
export interface HtmlResultMeta {
  html?: HtmlMetaHtml
  twitter?: HtmlMetaTwitter
  sailthru?: HtmlMetaSailthru
  dc?: HtmlMetaDublinCore
  jsonLd?: HtmlMetaJsonLd
  rdfa?: HtmlMetaRdfa
  applinks?: HtmlMetaAppLinks
  microdata?: HtmlMetaMicrodata | HtmlMetaMicrodata[]
  oembed?: HtmlMetaOEmbed
}

export interface BaseInfo {
  originalUrl: string
  contentUrl: string
  contentSize?: number
  encodingFormat?: string
  dateModified?: Date
}

export interface LinkResult extends BaseInfo {
  type: 'link'
}

export interface ImageResult extends BaseInfo {
  type: 'image'
  exif?: any
}

export interface VideoResult extends BaseInfo {
  type: 'video'
  exif?: any
}

export interface HtmlResult extends BaseInfo {
  type: 'html'
  meta?: HtmlResultMeta
}

export type Result = LinkResult | ImageResult | VideoResult | HtmlResult

export interface HtmlMetaHtml {
  title?: string
  description?: string
  author?: string
  tags?: string // "*,*,..."
  language?: string
  canonical?: string
  date?: string // Date
  icons?: HtmlIconMeta[]
}

export interface HtmlIconMeta {
  url: string
  sizes?: string
  type?: string
}

export interface HtmlMetaTwitter {
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

export interface HtmlMetaDublinCore {
  title?: string
  date?: string // Date
  'date.issued'?: string // Date
  'date.modified'?: string // Date
  [key: string]: string | void
}

export interface HtmlMetaSailthru {
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

export interface HtmlMetaRdfa {
  [subject: string]: {
    [predicate: string]: string | string[]
  }
}

export interface HtmlMetaJsonLd {
  [key: string]: any
}

export interface HtmlMetaMicrodata {
  [key: string]: string | string[] | HtmlMetaMicrodata
}

export interface HtmlMetaAppLinks {
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

export interface HtmlMetaOEmbed {
  type: string
  version: '1.0'
  title?: string
  author_name?: string
  author_url?: string
  provider_name?: string
  provider_url?: string
  cache_age?: string | number
  thumbnail_url?: string
  thumbnail_width?: string
  thumbnail_height?: string
  // `photo`.
  url?: string
  // `video`, `rich`.
  html?: string
  // `photo`, `video`, `rich`.
  width?: string
  height?: string
  [key: string]: any
}

/**
 * Snippets.
 */
export interface HtmlSnippetAppLink {
  id: string
  name: string
  url: string
}

export interface HtmlSnippetLocale {
  primary?: string
  alternate?: string[]
}

export interface HtmlSnippetImage {
  url: string
  secureUrl?: string
  alt?: string
  type?: string
  width?: number
  height?: number
}

export interface HtmlSnippetPlayer {
  url: string
  width: number
  height: number
  streamUrl?: string
  streamContentType?: string
}

export interface HtmlSnippetVideo {
  url: string
  secureUrl?: string
  type?: string
  width?: number
  height?: number
}

export interface HtmlSnippetAudio {
  url: string
  secureUrl?: string
  type?: string
}

export interface HtmlSnippetTwitter {
  siteId?: string
  siteHandle?: string
  creatorId?: string
  creatorHandle?: string
}

export interface HtmlSnippetIcon {
  url: string
  type?: string
  sizes?: string
}

export interface HtmlSnippetApps {
  iphone?: HtmlSnippetAppLink
  ipad?: HtmlSnippetAppLink
  android?: HtmlSnippetAppLink
  windows?: HtmlSnippetAppLink
  windowsPhone?: HtmlSnippetAppLink
}

export interface HtmlContentTypeArticle {
  type: 'article'
  section?: string
  dateModified?: Date
  datePublished?: Date
  dateExpires?: Date
}

export interface HtmlContentTypeImage {
  type: 'image'
}

export interface HtmlContentTypeVideo {
  type: 'video'
}

export type HtmlContentType = HtmlContentTypeArticle | HtmlContentTypeVideo | HtmlContentTypeImage

export interface HtmlSnippet extends BaseInfo {
  type: 'html'
  contentType: HtmlContentType
  image?: HtmlSnippetImage | HtmlSnippetImage[]
  video?: HtmlSnippetVideo | HtmlSnippetVideo[]
  audio?: HtmlSnippetAudio | HtmlSnippetAudio[]
  player?: HtmlSnippetPlayer
  determiner?: string
  headline?: string
  caption?: string
  tags?: string[]
  author?: string
  publisher?: string
  siteName?: string
  ttl?: number
  icon?: HtmlSnippetIcon
  locale?: HtmlSnippetLocale
  twitter?: HtmlSnippetTwitter
  apps?: HtmlSnippetApps
}

export interface VideoSnippet extends BaseInfo {
  type: 'video'
}

export interface ImageSnippet extends BaseInfo {
  type: 'image'
  width?: number
  height?: number
}

export interface LinkSnippet extends BaseInfo {
  type: 'link'
}

export type Snippet = VideoSnippet | ImageSnippet | HtmlSnippet | HtmlContentTypeArticle
