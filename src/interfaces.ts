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
}

export interface Rule {
  supported (base: BaseResult, headers: Headers): boolean
  handle (
    base: BaseResult,
    headers: Headers,
    stream: Readable,
    abort: AbortFn,
    options: Options
  ): Result | Promise<Result>
}

/**
 * Metadata.
 */
export interface ResultMeta {
  html?: HtmlMeta
  twitter?: TwitterMeta
  sailthru?: SailthruMeta
  dc?: DublinCoreMeta
  jsonLd?: JsonLdMeta
  rdfa?: RdfaMeta
  applinks?: AppLinksMeta
  microdata?: MicrodataMeta | MicrodataMeta[]
  oembed?: OEmbedMeta
}

export interface BaseResult {
  originalUrl: string
  contentUrl: string
  contentSize?: number
  encodingFormat?: string
  dateModified?: Date
  meta?: ResultMeta
}

export interface LinkResult extends BaseResult {
  type: 'link'
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

export type Result = LinkResult | ImageResult | VideoResult | HtmlResult

export interface HtmlMeta {
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

export interface OEmbedMeta {
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
export interface SnippetAppLink {
  id: string
  name: string
  url: string
}

export interface SnippetLocale {
  primary?: string
  alternate?: string[]
}

export interface SnippetImage {
  url: string
  secureUrl?: string
  alt?: string
  type?: string
  width?: number
  height?: number
}

export interface SnippetPlayer {
  url: string
  width: number
  height: number
  streamUrl?: string
  streamContentType?: string
}

export interface SnippetVideo {
  url: string
  secureUrl?: string
  type?: string
  width?: number
  height?: number
}

export interface SnippetAudio {
  url: string
  secureUrl?: string
  type?: string
}

export interface SnippetTwitter {
  siteId?: string
  siteHandle?: string
  creatorId?: string
  creatorHandle?: string
}

export interface SnippetIcon {
  url: string
  type?: string
  sizes?: string
}

export interface SnippetApps {
  iphone?: SnippetAppLink
  ipad?: SnippetAppLink
  android?: SnippetAppLink
  windows?: SnippetAppLink
  windowsPhone?: SnippetAppLink
}

export interface BaseSnippet extends BaseResult {
  image?: SnippetImage | SnippetImage[]
  video?: SnippetVideo | SnippetVideo[]
  audio?: SnippetAudio | SnippetAudio[]
  player?: SnippetPlayer
  determiner?: string
  headline?: string
  caption?: string
  tags?: string[]
  author?: string
  publisher?: string
  siteName?: string
  ttl?: number
  icon?: SnippetIcon
  locale?: SnippetLocale
  twitter?: SnippetTwitter
  apps?: SnippetApps
}

export interface ArticleSnippet extends BaseResult {
  type: 'article'
  section?: string
  dateModified?: Date
  datePublished?: Date
  dateExpires?: Date
}

export interface VideoSnippet extends BaseSnippet {
  type: 'video'
  subtype?: 'raw' | 'image'
}

export interface ImageSnippet extends BaseSnippet {
  type: 'image'
  subtype?: 'raw' | 'image'
}

export interface SummarySnippet extends BaseSnippet {
  type: 'summary'
  subtype?: 'image'
}

export interface LinkSnippet extends BaseSnippet {
  type: 'link'
}

export type Snippet = VideoSnippet | ImageSnippet | SummarySnippet | ArticleSnippet
