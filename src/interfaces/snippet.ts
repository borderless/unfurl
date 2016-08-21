import { Base } from './options'

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

export interface HtmlSnippet extends Base {
  type: 'html'
  entity: Entity
  image?: HtmlSnippetImage | HtmlSnippetImage[]
  video?: HtmlSnippetVideo | HtmlSnippetVideo[]
  audio?: HtmlSnippetAudio | HtmlSnippetAudio[]
  player?: HtmlSnippetPlayer
  determiner?: string
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

export interface VideoSnippet extends Base {
  type: 'video'
}

export interface ImageSnippet extends Base {
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

export interface PdfSnippet extends Base {
  type: 'pdf'
  pageCount?: number
  producer?: string
  creator?: string
}

export interface LinkSnippet extends Base {
  type: 'link'
}

export type Snippet = PdfSnippet | LinkSnippet | VideoSnippet | ImageSnippet | HtmlSnippet
