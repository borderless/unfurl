import { Base } from './options'

export interface ScrapeResult extends Base {
  exifData?: any
  html?: ScrapeResultHtml
  twitter?: ScrapeResultTwitter
  sailthru?: ScrapeResultSailthru
  dublincore?: ScrapeResultDublinCore
  applinks?: ScrapeResultAppLinks
  oembed?: ScrapeResultOEmbed
  jsonld?: ScrapeResultJsonld
  rdfa?: ScrapeResultJsonld
  microdata?: ScrapeResultJsonld
}

export interface ScrapeResultHtml {
  title?: string
  description?: string
  author?: string
  tags?: string // "*,*,..."
  language?: string
  canonical?: string
  date?: string // Date
  icons?: HtmlIconMeta[]
  'application-name'?: string
  'apple-mobile-web-app-title'?: string
}

export interface HtmlIconMeta {
  url: string
  sizes?: string
  type?: string
}

export interface ScrapeResultTwitter {
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

export interface ScrapeResultDublinCore {
  title?: string
  date?: string // Date
  'date.issued'?: string // Date
  'date.modified'?: string // Date
  [key: string]: string | void
}

export interface ScrapeResultSailthru {
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

export interface ScrapeResultJsonld {
  [key: string]: any
}

export interface ScrapeResultAppLinks {
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

export interface ScrapeResultOEmbed {
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
