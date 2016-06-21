import arrify = require('arrify')
import extend = require('xtend')
import Promise = require('any-promise')
import { resolve } from 'url'
import { scrapeUrl } from './scrape'
import { Result, ResultMeta, ImageResult, VideoResult, BaseResult } from './interfaces'

export type ExtractType = 'video' | 'image' | 'article' | 'summary'

/**
 * Extract rich snippets from the scraping result.
 */
export function extract (result: Result, priority: ExtractType[] = ['video', 'image', 'article', 'summary']): Snippet {
  if (result == null) {
    return
  }

  for (const type of priority) {
    const extract = extracts[type]

    if (extract) {
      const out = extract(result)

      if (out) {
        return out
      }
    }
  }
}

/**
 * Extract the rich snippet from a URL.
 */
export function extractFromUrl (url: string, priority?: ExtractType[]): Promise<Snippet> {
  return scrapeUrl(url).then(res => extract(res, priority))
}

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
  url?: string
  alt?: string
  width?: number
  height?: number
}

export interface SnippetTwitter {
  siteId?: string
  siteHandle?: string
  creatorId?: string
  creatorHandle?: string
}

export interface SnippetApps {
  iphone?: SnippetAppLink
  ipad?: SnippetAppLink
  android?: SnippetAppLink
  windows?: SnippetAppLink
  windowsPhone?: SnippetAppLink
}

export interface BaseSnippet extends BaseResult {
  image?: SnippetImage
  originalUrl?: string
  determiner?: string
  headline?: string
  caption?: string
  tags?: string[]
  author?: string
  publisher?: string
  siteName?: string
  ttl?: number
  locale?: SnippetLocale
  twitter?: SnippetTwitter
  apps?: SnippetApps
}

export interface ArticleSnippet extends BaseResult {
  type: 'article'
  dateModified?: Date
  datePublished?: Date
  dateExpires?: Date
}

export interface VideoSnippet extends BaseSnippet {
  type: 'video'
}

export interface ImageSnippet extends BaseSnippet {
  type: 'image'
}

export interface SummarySnippet extends BaseSnippet {
  type: 'summary'
}

export type Snippet = VideoSnippet | ImageSnippet | SummarySnippet | ArticleSnippet

export interface Extracts {
  video (result: Result): VideoSnippet
  image (result: Result): ImageSnippet
  summary (result: Result): SummarySnippet
  [key: string]: (result: Result) => Snippet
}

export const extracts: Extracts = {
  image (result): ImageSnippet {
    const { type, meta } = result

    if (type === 'image') {
      return result as ImageResult
    }

    if (type === 'html') {
      if (
        getString(meta, ['twitter', 'card']) === 'photo'
      ) {
        return extend(extracts.summary(result), {
          type: 'image' as 'image'
        })
      }
    }
  },
  article (result): ArticleSnippet {
    const { type, meta } = result

    if (type === 'html') {
      if (getString(meta, ['rdfa', '', 'http://ogp.me/ns#type']) === 'article') {
        return extend(extracts.summary(result), {
          type: 'article' as 'article',
          datePublished: getDate(meta, ['rdfa', '', 'http://ogp.me/ns/article#published_time']),
          dateExpires: getDate(meta, ['rdfa', '', 'http://ogp.me/ns/article#expiration_time']),
          dateModified: getDate(meta, ['rdfa', '', 'http://ogp.me/ns/article#modified_time'])
        })
      }
    }
  },
  video (result): VideoSnippet {
    const { type, meta } = result

    if (type === 'video') {
      return result as VideoResult
    }

    if (type === 'html') {
      if (
        getString(meta, ['twitter', 'card']) === 'player' ||
        getString(meta, ['rdfa', '', 'http://ogp.me/ns#type']) === 'video'
      ) {
        return extend(extracts.summary(result), {
          type: 'video' as 'video'
        })
      }
    }
  },
  summary (result): SummarySnippet {
    const { type, contentUrl, meta } = result

    if (type === 'html') {
      return {
        type: 'summary',
        image: getMetaImage(meta, contentUrl),
        contentUrl: getMetaUrl(meta, contentUrl),
        contentSize: result.contentSize,
        originalUrl: result.contentUrl,
        encodingFormat: result.encodingFormat,
        determiner: getMetaDeterminer(meta),
        headline: getMetaHeadline(meta),
        caption: getMetaCaption(meta),
        siteName: getMetaSiteName(meta),
        author: getMetaAuthor(meta),
        publisher: getMetaPublisher(meta),
        ttl: getMetaTtl(meta),
        tags: getMetaTags(meta),
        locale: getMetaLocale(meta),
        twitter: getMetaTwitter(meta),
        apps: getMetaApps(meta)
      }
    }
  }
}

/**
 * Select a value from an object.
 */
function get <T> (obj: any, path: string[]): T {
  let res = obj

  for (const key of path) {
    if (!(key in res)) {
      return
    }

    res = res[key]
  }

  return res
}

/**
 * Return a value as a string.
 */
function getString (meta: ResultMeta, path: string[]): string {
  const value = get<any>(meta, path)

  if (Array.isArray(value)) {
    if (typeof value[0] === 'string') {
      return value[0]
    }
  }

  if (typeof value === 'string') {
    return value
  }
}

/**
 * Return an array of values.
 */
function getArray (meta: ResultMeta, path: string[]): string[] {
  const value = get<any>(meta, path)

  return value ? arrify(value) : undefined
}

/**
 * Return a value as a number.
 */
function getNumber (meta: ResultMeta, path: string[]): number {
  const value = Number(getString(meta, path))

  return isNaN(value) ? undefined : value
}

/**
 * Return a value in date format.
 */
function getDate (meta: ResultMeta, path: string[]): Date {
  const value = new Date(getString(meta, path))

  return isNaN(value.getTime()) ? undefined : value
}

/**
 * Get URL from the meta object.
 */
function getUrl (meta: ResultMeta, path: string[], baseUrl: string): string {
  const value = getString(meta, path)

  if (value) {
    return resolve(baseUrl, value)
  }

  return value
}

/**
 * Get the canonical URL from the metadata.
 */
function getMetaUrl (meta: ResultMeta, baseUrl: string) {
  return getUrl(meta, ['twitter', 'url'], baseUrl) ||
    getUrl(meta, ['rdfa', '', 'http://ogp.me/ns#url'], baseUrl) ||
    getUrl(meta, ['html', 'canonical'], baseUrl) ||
    getUrl(meta, ['applinks', 'web:url'], baseUrl)
}

/**
 * Get the metadata author.
 */
function getMetaAuthor (meta: ResultMeta) {
  return getString(meta, ['html', 'author']) ||
    getString(meta, ['sailthru', 'author']) ||
    getString(meta, ['rdfa', '', 'http://ogp.me/ns/article#author']) ||
    getString(meta, ['rdfa', '', 'https://creativecommons.org/ns#attributionName'])
}

/**
 * Get tags from metadata.
 */
function getMetaTags (meta: ResultMeta): string[] {
  const htmlKeywords = getString(meta, ['html', 'keywords'])

  if (htmlKeywords) {
    return htmlKeywords.split(/ *, */)
  }

  const metaTags = get<string | string[]>(meta, ['rdfa', '', 'http://ogp.me/ns#video:tag'])

  if (metaTags) {
    return arrify(metaTags)
  }
}

/**
 * Get the publisher from metadata.
 */
function getMetaPublisher (meta: ResultMeta) {
  return getString(meta, ['rdfa', '', 'http://ogp.me/ns/article#publisher'])
}

/**
 * Get the name of the site.
 */
function getMetaSiteName (meta: ResultMeta) {
  return getString(meta, ['rdfa', '', 'http://ogp.me/ns#site_name']) ||
    getString(meta, ['twitter', 'app:name:iphone']) ||
    getString(meta, ['twitter', 'app:name:ipad']) ||
    getString(meta, ['twitter', 'app:name:googleplay']) ||
    getString(meta, ['applinks', 'ios:app_name']) ||
    getString(meta, ['applinks', 'ipad:app_name']) ||
    getString(meta, ['applinks', 'iphone:app_name']) ||
    getString(meta, ['twitter', 'android:app_name'])
}

/**
 * Get the headline from the site.
 */
function getMetaHeadline (meta: ResultMeta) {
  return getString(meta, ['twitter', 'title']) ||
    getString(meta, ['rdfa', '', 'http://ogp.me/ns#title']) ||
    getString(meta, ['html', 'title'])
}

/**
 * Get the caption from the site.
 */
function getMetaCaption (meta: ResultMeta) {
  return getString(meta, ['twitter', 'description']) ||
    getString(meta, ['rdfa', '', 'http://ogp.me/ns#description']) ||
    getString(meta, ['html', 'description'])
}

/**
 * Get the meta image url.
 */
function getMetaImage (meta: ResultMeta, baseUrl: string): SnippetImage {
  const ogpImage = getUrl(meta, ['rdfa', '', 'http://ogp.me/ns#image'], baseUrl)
  const twitterImage = getUrl(meta, ['twitter', 'image'], baseUrl)

  if (twitterImage) {
    return {
      url: twitterImage,
      alt: getString(meta, ['twitter', 'image:alt']),
      width: getNumber(meta, ['twitter', 'image:width']),
      height: getNumber(meta, ['twitter', 'image:height'])
    }
  }

  if (ogpImage) {
    return {
      url: ogpImage
    }
  }
}

/**
 * Get apps metadata.
 */
function getMetaApps (meta: ResultMeta): SnippetApps {
  return {
    iphone: getMetaIphoneApp(meta),
    ipad: getMetaIpadApp(meta),
    android: getMetaAndroidApp(meta),
    windows: getMetaWindowsApp(meta),
    windowsPhone: getMetaWindowsPhoneApp(meta)
  }
}

/**
 * Extract iPad app information from metadata.
 */
function getMetaIpadApp (meta: ResultMeta): SnippetAppLink {
  const twitterIpadUrl = getString(meta, ['twitter', 'app:url:ipad'])
  const twitterIpadId = getString(meta, ['twitter', 'app:id:ipad'])
  const twitterIpadName = getString(meta, ['twitter', 'app:name:ipad'])

  if (twitterIpadId && twitterIpadName && twitterIpadUrl) {
    return {
      id: twitterIpadId,
      name: twitterIpadName,
      url: twitterIpadUrl
    }
  }

  const applinksIpadUrl = getString(meta, ['applinks', 'ipad:url'])
  const applinksIpadId = getString(meta, ['applinks', 'ipad:app_store_id'])
  const applinksIpadName = getString(meta, ['applinks', 'ipad:app_name'])

  if (applinksIpadId && applinksIpadName && applinksIpadUrl) {
    return {
      id: applinksIpadId,
      name: applinksIpadName,
      url: applinksIpadUrl
    }
  }

  return getMetaIosApp(meta)
}

/**
 * Extract iPhone app information from metadata.
 */
function getMetaIphoneApp (meta: ResultMeta): SnippetAppLink {
  const twitterIphoneUrl = getString(meta, ['twitter', 'app:url:iphone'])
  const twitterIphoneId = getString(meta, ['twitter', 'app:id:iphone'])
  const twitterIphoneName = getString(meta, ['twitter', 'app:name:iphone'])

  if (twitterIphoneId && twitterIphoneName && twitterIphoneUrl) {
    return {
      id: twitterIphoneId,
      name: twitterIphoneName,
      url: twitterIphoneUrl
    }
  }

  const applinksIphoneUrl = getString(meta, ['applinks', 'iphone:url'])
  const applinksIphoneId = getString(meta, ['applinks', 'iphone:app_store_id'])
  const applinksIphoneName = getString(meta, ['applinks', 'iphone:app_name'])

  if (applinksIphoneId && applinksIphoneName && applinksIphoneUrl) {
    return {
      id: applinksIphoneId,
      name: applinksIphoneName,
      url: applinksIphoneUrl
    }
  }

  return getMetaIosApp(meta)
}

/**
 * Extract the iOS app metadata.
 */
function getMetaIosApp (meta: ResultMeta): SnippetAppLink {
  const applinksUrl = getString(meta, ['applinks', 'ios:url'])
  const applinksId = getString(meta, ['applinks', 'ios:app_store_id'])
  const applinksName = getString(meta, ['applinks', 'ios:app_name'])

  if (applinksId && applinksName && applinksUrl) {
    return {
      id: applinksId,
      name: applinksName,
      url: applinksUrl
    }
  }
}

/**
 * Extract Android app metadata.
 */
function getMetaAndroidApp (meta: ResultMeta): SnippetAppLink {
  const twitterAndroidUrl = getString(meta, ['twitter', 'app:url:googleplay'])
  const twitterAndroidId = getString(meta, ['twitter', 'app:id:googleplay'])
  const twitterAndroidName = getString(meta, ['twitter', 'app:name:googleplay'])

  if (twitterAndroidId && twitterAndroidName && twitterAndroidUrl) {
    return {
      id: twitterAndroidId,
      name: twitterAndroidName,
      url: twitterAndroidUrl
    }
  }

  const applinksAndroidUrl = getString(meta, ['applinks', 'android:url'])
  const applinksAndroidId = getString(meta, ['applinks', 'android:package'])
  const applinksAndroidName = getString(meta, ['applinks', 'android:app_name'])

  if (applinksAndroidId && applinksAndroidName && applinksAndroidUrl) {
    return {
      id: applinksAndroidId,
      name: applinksAndroidName,
      url: applinksAndroidUrl
    }
  }
}

/**
 * Extract Windows Phone app metadata.
 */
function getMetaWindowsPhoneApp (meta: ResultMeta): SnippetAppLink {
  const applinksWindowsPhoneUrl = getString(meta, ['applinks', 'windows_phone:url'])
  const applinksWindowsPhoneId = getString(meta, ['applinks', 'windows_phone:app_id'])
  const applinksWindowsPhoneName = getString(meta, ['applinks', 'windows_phone:app_name'])

  if (applinksWindowsPhoneId && applinksWindowsPhoneName && applinksWindowsPhoneUrl) {
    return {
      id: applinksWindowsPhoneId,
      name: applinksWindowsPhoneName,
      url: applinksWindowsPhoneUrl
    }
  }

  return getMetaWindowsUniversalApp(meta)
}

/**
 * Extract Windows app metadata.
 */
function getMetaWindowsApp (meta: ResultMeta): SnippetAppLink {
  const applinksWindowsUrl = getString(meta, ['applinks', 'windows:url'])
  const applinksWindowsId = getString(meta, ['applinks', 'windows:app_id'])
  const applinksWindowsName = getString(meta, ['applinks', 'windows:app_name'])

  if (applinksWindowsId && applinksWindowsName && applinksWindowsUrl) {
    return {
      id: applinksWindowsId,
      name: applinksWindowsName,
      url: applinksWindowsUrl
    }
  }

  return getMetaWindowsUniversalApp(meta)
}

/**
 * Extract Windows Universal app metadata.
 */
function getMetaWindowsUniversalApp (meta: ResultMeta): SnippetAppLink {
  const applinksWindowsUniversalUrl = getString(meta, ['applinks', 'windows_universal:url'])
  const applinksWindowsUniversalId = getString(meta, ['applinks', 'windows_universal:app_id'])
  const applinksWindowsUniversalName = getString(meta, ['applinks', 'windows_universal:app_name'])

  if (applinksWindowsUniversalId && applinksWindowsUniversalName && applinksWindowsUniversalUrl) {
    return {
      id: applinksWindowsUniversalId,
      name: applinksWindowsUniversalName,
      url: applinksWindowsUniversalUrl
    }
  }
}

/**
 * Get locale data.
 */
function getMetaLocale (meta: ResultMeta): SnippetLocale {
  const primary = getString(meta, ['rdfa', '', 'http://ogp.me/ns#locale'])
  const alternate = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#locale:alternate'])

  if (primary || alternate) {
    return { primary, alternate }
  }
}

/**
 * Get twitter data.
 */
function getMetaTwitter (meta: ResultMeta): SnippetTwitter {
  const creatorId = getString(meta, ['twitter', 'creator:id'])
  const creatorHandle = getTwitterHandle(meta, ['twitter', 'creator'])
  const siteId = getString(meta, ['twitter', 'site:id'])
  const siteHandle = getTwitterHandle(meta, ['twitter', 'site'])

  if (siteId || siteHandle || creatorId || creatorHandle) {
    return {
      siteId,
      siteHandle,
      creatorId,
      creatorHandle
    }
  }
}

function getTwitterHandle (meta: ResultMeta, path: string[]) {
  const value = getString(meta, path)

  if (value) {
    // Normalize twitter handles.
    return value.replace(/^@/, '')
  }
}

/**
 * Get the TTL of the page.
 */
function getMetaTtl (meta: ResultMeta): number {
  return getNumber(meta, ['rdfa', '', 'http://ogp.me/ns#ttl'])
}

/**
 * Get the object determiner.
 */
function getMetaDeterminer (meta: ResultMeta): string {
  return getString(meta, ['rdfa', '', 'http://ogp.me/ns#determiner'])
}
