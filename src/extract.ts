import arrify = require('arrify')
import extend = require('xtend')
import Promise = require('any-promise')
import { scrapeUrl } from './scrape'
import { Result, ResultMeta, ImageResult, VideoResult, BaseResult } from './interfaces'

export type ExtractType = 'video' | 'image' | 'summary'

/**
 * Extract rich snippets from the scraping result.
 */
export function extract (result: Result, priority: ExtractType[] = ['video', 'image', 'summary']): Snippet {
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

export interface BaseSnippet extends BaseResult {
  imageUrl?: string
  originalUrl?: string
  headline?: string
  caption?: string
  tags?: string[]
  author?: string
  publisher?: string
  siteName?: string
  apps?: {
    iphone?: SnippetAppLink
    ipad?: SnippetAppLink
    android?: SnippetAppLink
    windows?: SnippetAppLink
    windowsPhone?: SnippetAppLink
  }
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

export type Snippet = VideoSnippet | ImageSnippet | SummarySnippet

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
        getMetaString(meta, ['twitter', 'card']) === 'photo'
      ) {
        return extend(extracts.summary(result), {
          type: 'image' as 'image'
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
        getMetaString(meta, ['twitter', 'card']) === 'player' ||
        getMetaString(meta, ['rdfa', '', 'http://ogp.me/ns#type']) === 'video'
      ) {
        return extend(extracts.summary(result), {
          type: 'video' as 'video'
        })
      }
    }
  },
  summary (result): SummarySnippet {
    const { type, meta } = result

    if (type === 'html') {
      return {
        type: 'summary',
        imageUrl: getMetaImageUrl(meta),
        contentUrl: getMetaUrl(meta),
        originalUrl: result.contentUrl,
        encodingFormat: result.encodingFormat,
        headline: getMetaHeadline(meta),
        caption: getMetaCaption(meta),
        siteName: getMetaSiteName(meta),
        author: getMetaAuthor(meta),
        publisher: getMetaPublisher(meta),
        tags: getMetaTags(meta),
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
function getMetaString (meta: ResultMeta, path: string[]): string {
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
 * Get the canonical URL from the metadata.
 */
function getMetaUrl (meta: ResultMeta) {
  return getMetaString(meta, ['twitter', 'url']) ||
    getMetaString(meta, ['rdfa', '', 'http://ogp.me/ns#url']) ||
    getMetaString(meta, ['html', 'canonical']) ||
    getMetaString(meta, ['applinks', 'web:url'])
}

/**
 * Get the metadata author.
 */
function getMetaAuthor (meta: ResultMeta) {
  return getMetaString(meta, ['html', 'author']) ||
    getMetaString(meta, ['rdfa', '', 'http://ogp.me/ns/article#author']) ||
    getMetaString(meta, ['rdfa', '', 'https://creativecommons.org/ns#attributionName'])
}

/**
 * Get tags from metadata.
 */
function getMetaTags (meta: ResultMeta): string[] {
  const htmlKeywords = getMetaString(meta, ['html', 'keywords'])

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
  return getMetaString(meta, ['rdfa', '', 'http://ogp.me/ns/article#publisher'])
}

/**
 * Get the name of the site.
 */
function getMetaSiteName (meta: ResultMeta) {
  return getMetaString(meta, ['rdfa', '', 'http://ogp.me/ns#site_name']) ||
    getMetaString(meta, ['twitter', 'app:name:iphone']) ||
    getMetaString(meta, ['twitter', 'app:name:ipad']) ||
    getMetaString(meta, ['twitter', 'app:name:googleplay']) ||
    getMetaString(meta, ['applinks', 'ios:app_name']) ||
    getMetaString(meta, ['applinks', 'ipad:app_name']) ||
    getMetaString(meta, ['applinks', 'iphone:app_name']) ||
    getMetaString(meta, ['twitter', 'android:app_name'])
}

/**
 * Get the headline from the site.
 */
function getMetaHeadline (meta: ResultMeta) {
  return getMetaString(meta, ['twitter', 'title']) ||
    getMetaString(meta, ['rdfa', '', 'http://ogp.me/ns#title']) ||
    getMetaString(meta, ['html', 'title'])
}

/**
 * Get the caption from the site.
 */
function getMetaCaption (meta: ResultMeta) {
  return getMetaString(meta, ['twitter', 'description']) ||
    getMetaString(meta, ['rdfa', '', 'http://ogp.me/ns#description']) ||
    getMetaString(meta, ['html', 'description'])
}

/**
 * Get the meta image url.
 */
function getMetaImageUrl (meta: ResultMeta) {
  return getMetaString(meta, ['twitter', 'image']) ||
    getMetaString(meta, ['rdfa', '', 'http://ogp.me/ns#image'])
}

/**
 * Get apps metadata.
 */
function getMetaApps (meta: ResultMeta) {
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
  const twitterIpadUrl = getMetaString(meta, ['twitter', 'app:url:ipad'])
  const twitterIpadId = getMetaString(meta, ['twitter', 'app:id:ipad'])
  const twitterIpadName = getMetaString(meta, ['twitter', 'app:name:ipad'])

  if (twitterIpadId && twitterIpadName && twitterIpadUrl) {
    return {
      id: twitterIpadId,
      name: twitterIpadName,
      url: twitterIpadUrl
    }
  }

  const applinksIpadUrl = getMetaString(meta, ['applinks', 'ipad:url'])
  const applinksIpadId = getMetaString(meta, ['applinks', 'ipad:app_store_id'])
  const applinksIpadName = getMetaString(meta, ['applinks', 'ipad:app_name'])

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
  const twitterIphoneUrl = getMetaString(meta, ['twitter', 'app:url:iphone'])
  const twitterIphoneId = getMetaString(meta, ['twitter', 'app:id:iphone'])
  const twitterIphoneName = getMetaString(meta, ['twitter', 'app:name:iphone'])

  if (twitterIphoneId && twitterIphoneName && twitterIphoneUrl) {
    return {
      id: twitterIphoneId,
      name: twitterIphoneName,
      url: twitterIphoneUrl
    }
  }

  const applinksIphoneUrl = getMetaString(meta, ['applinks', 'iphone:url'])
  const applinksIphoneId = getMetaString(meta, ['applinks', 'iphone:app_store_id'])
  const applinksIphoneName = getMetaString(meta, ['applinks', 'iphone:app_name'])

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
  const applinksUrl = getMetaString(meta, ['applinks', 'ios:url'])
  const applinksId = getMetaString(meta, ['applinks', 'ios:app_store_id'])
  const applinksName = getMetaString(meta, ['applinks', 'ios:app_name'])

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
  const twitterAndroidUrl = getMetaString(meta, ['twitter', 'app:url:googleplay'])
  const twitterAndroidId = getMetaString(meta, ['twitter', 'app:id:googleplay'])
  const twitterAndroidName = getMetaString(meta, ['twitter', 'app:name:googleplay'])

  if (twitterAndroidId && twitterAndroidName && twitterAndroidUrl) {
    return {
      id: twitterAndroidId,
      name: twitterAndroidName,
      url: twitterAndroidUrl
    }
  }

  const applinksAndroidUrl = getMetaString(meta, ['applinks', 'android:url'])
  const applinksAndroidId = getMetaString(meta, ['applinks', 'android:package'])
  const applinksAndroidName = getMetaString(meta, ['applinks', 'android:app_name'])

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
  const applinksWindowsPhoneUrl = getMetaString(meta, ['applinks', 'windows_phone:url'])
  const applinksWindowsPhoneId = getMetaString(meta, ['applinks', 'windows_phone:app_id'])
  const applinksWindowsPhoneName = getMetaString(meta, ['applinks', 'windows_phone:app_name'])

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
  const applinksWindowsUrl = getMetaString(meta, ['applinks', 'windows:url'])
  const applinksWindowsId = getMetaString(meta, ['applinks', 'windows:app_id'])
  const applinksWindowsName = getMetaString(meta, ['applinks', 'windows:app_name'])

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
  const applinksWindowsUniversalUrl = getMetaString(meta, ['applinks', 'windows_universal:url'])
  const applinksWindowsUniversalId = getMetaString(meta, ['applinks', 'windows_universal:app_id'])
  const applinksWindowsUniversalName = getMetaString(meta, ['applinks', 'windows_universal:app_name'])

  if (applinksWindowsUniversalId && applinksWindowsUniversalName && applinksWindowsUniversalUrl) {
    return {
      id: applinksWindowsUniversalId,
      name: applinksWindowsUniversalName,
      url: applinksWindowsUniversalUrl
    }
  }
}
