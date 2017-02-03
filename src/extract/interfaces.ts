/**
 * Content extraction options.
 */
export interface ExtractOptions {
  preferredIconSize?: number
}

export interface BaseSnippet {
  type?: string
  url: string
  canonicalUrl?: string
  encodingFormat?: string
}

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
  href: string
  type?: string
  size?: string
}

export interface HtmlSnippetApps {
  iphone?: HtmlSnippetAppLink
  ipad?: HtmlSnippetAppLink
  android?: HtmlSnippetAppLink
  windows?: HtmlSnippetAppLink
  windowsPhone?: HtmlSnippetAppLink
}

export interface ArticleEntity {
  type: 'article'
  section?: string
  publisher?: string
  dateModified?: Date
  datePublished?: Date
  dateExpires?: Date
}

export interface ImageEntity {
  type: 'image'
  url?: string
  width?: number
  heigth?: number
}

export interface VideoEntity {
  type: 'video'
  html?: string
  width?: number
  height?: number
}

export interface RichEntity {
  type: 'rich'
  html?: string
  width?: number
  height?: number
}

export type Entity = ArticleEntity | VideoEntity | ImageEntity | RichEntity

export interface HtmlSnippet extends BaseSnippet {
  type: 'html'
  entity?: Entity
  image?: HtmlSnippetImage | HtmlSnippetImage[]
  video?: HtmlSnippetVideo | HtmlSnippetVideo[]
  audio?: HtmlSnippetAudio | HtmlSnippetAudio[]
  player?: HtmlSnippetPlayer
  headline?: string
  description?: string
  tags?: string[]
  author?: {
    url?: string
    name?: string
  }
  provider?: {
    url?: string
    name?: string
  }
  ttl?: number
  icon?: HtmlSnippetIcon
  locale?: HtmlSnippetLocale
  twitter?: HtmlSnippetTwitter
  apps?: HtmlSnippetApps
}

export interface VideoSnippet extends BaseSnippet {
  type: 'video'
}

export interface ImageSnippet extends BaseSnippet {
  type: 'image'
  dateModified?: Date
  dateCreated?: Date
  width?: number
  height?: number
  make?: string
  model?: string
  lensMake?: string
  lensModel?: string
  software?: string
  orientation?: string
  megapixels?: number
}

export interface PdfSnippet extends BaseSnippet {
  type: 'pdf'
  author?: string
  title?: string
  pageCount?: number
  producer?: string
  creator?: string
  dateCreated?: Date
  dateModified?: Date
}

export interface LinkSnippet extends BaseSnippet {
  type: 'link'
}

export type Snippet = PdfSnippet | LinkSnippet | VideoSnippet | ImageSnippet | HtmlSnippet | BaseSnippet
