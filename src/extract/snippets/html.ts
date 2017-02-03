import { Path } from 'getvalue'
import { ScrapeResult } from '../../scrape'

import {
  Entity,
  ExtractOptions,
  HtmlSnippet,
  HtmlSnippetImage,
  HtmlSnippetAppLink,
  HtmlSnippetApps,
  HtmlSnippetAudio,
  HtmlSnippetLocale,
  HtmlSnippetPlayer,
  HtmlSnippetVideo,
  HtmlSnippetTwitter,
  HtmlSnippetIcon
} from '../interfaces'

import {
  getArray,
  getJsonLdArray,
  getValue,
  getJsonLdValue,
  toUrl,
  copyProps,
  toNumber,
  toDate
} from '../support'

export default function (result: ScrapeResult, options: ExtractOptions): HtmlSnippet {
  return {
    type: 'html',
    image: getImage(result),
    video: getVideo(result),
    audio: getAudio(result),
    player: getPlayer(result),
    entity: getEntity(result),
    url: result.url,
    canonicalUrl: getCanonicalUrl(result),
    encodingFormat: result.encodingFormat,
    headline: getHeadline(result),
    description: getDescription(result),
    provider: getProvider(result),
    author: getAuthor(result),
    ttl: getTtl(result),
    icon: getIcon(result, options),
    tags: getTags(result),
    locale: getLocale(result),
    twitter: getTwitter(result),
    apps: getApps(result)
  }
}

/**
 * Get the canonical URL from the metadata.
 */
function getCanonicalUrl (result: ScrapeResult) {
  return toUrl(getValue(result, ['twitter', 'url']), result.url) ||
    toUrl(getJsonLdValue(result, ['rdfa', 0, 'http://ogp.me/ns#url']), result.url) ||
    toUrl(getValue(result, ['html', 'canonical']), result.url) ||
    toUrl(getValue(result, ['applinks', 'web:url']), result.url) ||
    toUrl(getValue(result, ['oembed', 'url']), result.url)
}

/**
 * Get the metadata author.
 */
function getAuthor (result: ScrapeResult) {
  const name = getValue(result, ['html', 'author']) ||
    getValue(result, ['oembed', 'author_name']) ||
    getJsonLdValue(result, ['rdfa', 0, 'http://ogp.me/ns/article#author']) ||
    getJsonLdValue(result, ['rdfa', 0, 'https://creativecommons.org/ns#attributionName']) ||
    getValue(result, ['sailthru', 'author'])

  const url = getValue(result, ['oembed', 'author_url'])

  return { name, url }
}

/**
 * Get tags from metadata.
 */
function getTags (result: ScrapeResult): string[] | undefined {
  const htmlKeywords = getValue(result, ['html', 'keywords'])

  if (htmlKeywords) {
    return htmlKeywords.split(/ *, */)
  }

  const metaTags = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#video:tag'])

  if (metaTags) {
    return metaTags
  }

  return
}

/**
 * Get the name of the site.
 */
function getProvider (result: ScrapeResult) {
  const name = getJsonLdValue(result, ['rdfa', 0, 'http://ogp.me/ns#site_name']) ||
    getValue(result, ['oembed', 'provider_name']) ||
    getValue(result, ['html', 'application-name']) ||
    getValue(result, ['html', 'apple-mobile-web-app-title']) ||
    getValue(result, ['twitter', 'app:name:iphone']) ||
    getValue(result, ['twitter', 'app:name:ipad']) ||
    getValue(result, ['twitter', 'app:name:googleplay']) ||
    getValue(result, ['applinks', 'ios:app_name']) ||
    getValue(result, ['applinks', 'ipad:app_name']) ||
    getValue(result, ['applinks', 'iphone:app_name']) ||
    getValue(result, ['twitter', 'android:app_name'])

  const url = getValue(result, ['oembed', 'provider_url'])

  return { name, url }
}

/**
 * Get the headline from the site.
 */
function getHeadline (result: ScrapeResult) {
  return getValue(result, ['twitter', 'title']) ||
    getValue(result, ['oembed', 'title']) ||
    getJsonLdValue(result, ['rdfa', 0, 'http://ogp.me/ns#title']) ||
    getJsonLdValue(result, ['rdfa', 0, 'http://purl.org/dc/terms/title']) ||
    getValue(result, ['html', 'title'])
}

/**
 * Get the caption from the site.
 */
function getDescription (result: ScrapeResult) {
  return getJsonLdValue(result, ['rdfa', 0, 'http://ogp.me/ns#description']) ||
    getValue(result, ['oembed', 'summary']) ||
    getValue(result, ['twitter', 'description']) ||
    getValue(result, ['html', 'description'])
}

/**
 * Get the meta image url.
 */
function getImage (result: ScrapeResult): HtmlSnippetImage | HtmlSnippetImage[] {
  const ogpImages = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#image']) ||
    getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#image:url'])
  const twitterImages = getArray(result, ['twitter', 'image']) || getArray(result, ['twitter', 'image0'])
  const images: HtmlSnippetImage[] = []

  function addImage (newImage: HtmlSnippetImage, append: boolean) {
    for (const image of images) {
      if (image.url === newImage.url) {
        copyProps(image, newImage)
        return
      }
    }

    if (append) {
      images.push(newImage)
    }
  }

  function addImages (
    urls: string[],
    secureUrls: string[] | undefined,
    types: string[] | undefined,
    alts: string[] | undefined,
    widths: string[] | undefined,
    heights: string[] | undefined,
    append: boolean
  ) {
    for (let i = 0; i < urls.length; i++) {
      addImage(
        {
          url: urls[i],
          secureUrl: secureUrls ? secureUrls[i] : undefined,
          type: types ? types[i] : undefined,
          alt: alts ? alts[i] : undefined,
          width: widths ? toNumber(widths[i]) : undefined,
          height: heights ? toNumber(heights[i]) : undefined
        },
        append
      )
    }
  }

  if (ogpImages) {
    const ogpTypes = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#image:type'])
    const ogpWidths = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#image:width'])
    const ogpHeights = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#image:height'])
    const ogpSecureUrls = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#image:secure_url'])

    addImages(ogpImages, ogpSecureUrls, ogpTypes, undefined, ogpWidths, ogpHeights, true)
  }

  if (twitterImages) {
    const twitterAlts = getArray(result, ['twitter', 'image:alt'])
    const twitterWidths = getArray(result, ['twitter', 'image:width'])
    const twitterHeights = getArray(result, ['twitter', 'image:height'])

    addImages(twitterImages, undefined, undefined, twitterAlts, twitterWidths, twitterHeights, !ogpImages)
  }

  return images
}

/**
 * Get the meta audio information.
 */
function getAudio (result: ScrapeResult): HtmlSnippetAudio | HtmlSnippetAudio[] {
  const ogpAudios = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#audio']) ||
    getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#audio:url'])
  const audios: HtmlSnippetAudio[] = []

  function addAudio (newAudio: HtmlSnippetAudio) {
    for (const audio of audios) {
      if (audio.url === newAudio.url) {
        copyProps(audio, newAudio)
        return
      }
    }

    audios.push(newAudio)
  }

  function addAudios (urls: string[], secureUrls: string[] | undefined, types: string[] | undefined) {
    for (let i = 0; i < urls.length; i++) {
      addAudio({
        url: urls[i],
        secureUrl: secureUrls ? secureUrls[i] : undefined,
        type: types ? types[i] : undefined
      })
    }
  }

  if (ogpAudios) {
    const ogpTypes = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#audio:type'])
    const ogpSecureUrls = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#audio:secure_url'])

    addAudios(ogpAudios, ogpSecureUrls, ogpTypes)
  }

  return audios
}

/**
 * Get the meta image url.
 */
function getVideo (result: ScrapeResult): HtmlSnippetVideo | HtmlSnippetVideo[] {
  const ogpVideos = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#video']) ||
    getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#video:url'])
  const videos: HtmlSnippetVideo[] = []

  function addVideo (newVideo: HtmlSnippetVideo) {
    for (const video of videos) {
      if (video.url === newVideo.url) {
        copyProps(video, newVideo)
        return
      }
    }

    videos.push(newVideo)
  }

  function addVideos (
    urls: string[],
    secureUrls: string[] | undefined,
    types: string[] | undefined,
    widths: string[] | undefined,
    heights: string[] | undefined
  ) {
    for (let i = 0; i < urls.length; i++) {
      addVideo({
        url: urls[i],
        secureUrl: secureUrls ? secureUrls[i] : undefined,
        type: types ? types[i] : undefined,
        width: widths ? toNumber(widths[i]) : undefined,
        height: heights ? toNumber(heights[i]) : undefined
      })
    }
  }

  if (ogpVideos) {
    const ogpTypes = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#video:type'])
    const ogpWidths = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#video:width'])
    const ogpHeights = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#video:height'])
    const ogpSecureUrls = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#video:secure_url'])

    addVideos(ogpVideos, ogpSecureUrls, ogpTypes, ogpWidths, ogpHeights)
  }

  return videos
}

/**
 * Get apps metadata.
 */
function getApps (result: ScrapeResult): HtmlSnippetApps {
  return {
    iphone: getIphoneApp(result),
    ipad: getIpadApp(result),
    android: getAndroidApp(result),
    windows: getWindowsApp(result),
    windowsPhone: getWindowsPhoneApp(result)
  }
}

/**
 * Extract iPad app information from metadata.
 */
function getIpadApp (result: ScrapeResult): HtmlSnippetAppLink | undefined {
  const twitterIpadUrl = getValue(result, ['twitter', 'app:url:ipad'])
  const twitterIpadId = getValue(result, ['twitter', 'app:id:ipad'])
  const twitterIpadName = getValue(result, ['twitter', 'app:name:ipad'])

  if (twitterIpadId && twitterIpadName && twitterIpadUrl) {
    return {
      id: twitterIpadId,
      name: twitterIpadName,
      url: twitterIpadUrl
    }
  }

  const applinksIpadUrl = getValue(result, ['applinks', 'ipad:url'])
  const applinksIpadId = getValue(result, ['applinks', 'ipad:app_store_id'])
  const applinksIpadName = getValue(result, ['applinks', 'ipad:app_name'])

  if (applinksIpadId && applinksIpadName && applinksIpadUrl) {
    return {
      id: applinksIpadId,
      name: applinksIpadName,
      url: applinksIpadUrl
    }
  }

  return getIosApp(result)
}

/**
 * Extract iPhone app information from metadata.
 */
function getIphoneApp (result: ScrapeResult): HtmlSnippetAppLink | undefined {
  const twitterIphoneUrl = getValue(result, ['twitter', 'app:url:iphone'])
  const twitterIphoneId = getValue(result, ['twitter', 'app:id:iphone'])
  const twitterIphoneName = getValue(result, ['twitter', 'app:name:iphone'])

  if (twitterIphoneId && twitterIphoneName && twitterIphoneUrl) {
    return {
      id: twitterIphoneId,
      name: twitterIphoneName,
      url: twitterIphoneUrl
    }
  }

  const applinksIphoneUrl = getValue(result, ['applinks', 'iphone:url'])
  const applinksIphoneId = getValue(result, ['applinks', 'iphone:app_store_id'])
  const applinksIphoneName = getValue(result, ['applinks', 'iphone:app_name'])

  if (applinksIphoneId && applinksIphoneName && applinksIphoneUrl) {
    return {
      id: applinksIphoneId,
      name: applinksIphoneName,
      url: applinksIphoneUrl
    }
  }

  return getIosApp(result)
}

/**
 * Extract the iOS app metadata.
 */
function getIosApp (result: ScrapeResult): HtmlSnippetAppLink | undefined {
  const applinksUrl = getValue(result, ['applinks', 'ios:url'])
  const applinksId = getValue(result, ['applinks', 'ios:app_store_id'])
  const applinksName = getValue(result, ['applinks', 'ios:app_name'])

  if (applinksId && applinksName && applinksUrl) {
    return {
      id: applinksId,
      name: applinksName,
      url: applinksUrl
    }
  }

  return
}

/**
 * Extract Android app metadata.
 */
function getAndroidApp (result: ScrapeResult): HtmlSnippetAppLink | undefined {
  const twitterAndroidUrl = getValue(result, ['twitter', 'app:url:googleplay'])
  const twitterAndroidId = getValue(result, ['twitter', 'app:id:googleplay'])
  const twitterAndroidName = getValue(result, ['twitter', 'app:name:googleplay'])

  if (twitterAndroidId && twitterAndroidName && twitterAndroidUrl) {
    return {
      id: twitterAndroidId,
      name: twitterAndroidName,
      url: twitterAndroidUrl
    }
  }

  const applinksAndroidUrl = getValue(result, ['applinks', 'android:url'])
  const applinksAndroidId = getValue(result, ['applinks', 'android:package'])
  const applinksAndroidName = getValue(result, ['applinks', 'android:app_name'])

  if (applinksAndroidId && applinksAndroidName && applinksAndroidUrl) {
    return {
      id: applinksAndroidId,
      name: applinksAndroidName,
      url: applinksAndroidUrl
    }
  }

  return
}

/**
 * Extract Windows Phone app metadata.
 */
function getWindowsPhoneApp (result: ScrapeResult): HtmlSnippetAppLink | undefined {
  const applinksWindowsPhoneUrl = getValue(result, ['applinks', 'windows_phone:url'])
  const applinksWindowsPhoneId = getValue(result, ['applinks', 'windows_phone:app_id'])
  const applinksWindowsPhoneName = getValue(result, ['applinks', 'windows_phone:app_name'])

  if (applinksWindowsPhoneId && applinksWindowsPhoneName && applinksWindowsPhoneUrl) {
    return {
      id: applinksWindowsPhoneId,
      name: applinksWindowsPhoneName,
      url: applinksWindowsPhoneUrl
    }
  }

  return getWindowsUniversalApp(result)
}

/**
 * Extract Windows app metadata.
 */
function getWindowsApp (result: ScrapeResult): HtmlSnippetAppLink | undefined {
  const applinksWindowsUrl = getValue(result, ['applinks', 'windows:url'])
  const applinksWindowsId = getValue(result, ['applinks', 'windows:app_id'])
  const applinksWindowsName = getValue(result, ['applinks', 'windows:app_name'])

  if (applinksWindowsId && applinksWindowsName && applinksWindowsUrl) {
    return {
      id: applinksWindowsId,
      name: applinksWindowsName,
      url: applinksWindowsUrl
    }
  }

  return getWindowsUniversalApp(result)
}

/**
 * Extract Windows Universal app metadata.
 */
function getWindowsUniversalApp (result: ScrapeResult): HtmlSnippetAppLink | undefined {
  const applinksWindowsUniversalUrl = getValue(result, ['applinks', 'windows_universal:url'])
  const applinksWindowsUniversalId = getValue(result, ['applinks', 'windows_universal:app_id'])
  const applinksWindowsUniversalName = getValue(result, ['applinks', 'windows_universal:app_name'])

  if (applinksWindowsUniversalId && applinksWindowsUniversalName && applinksWindowsUniversalUrl) {
    return {
      id: applinksWindowsUniversalId,
      name: applinksWindowsUniversalName,
      url: applinksWindowsUniversalUrl
    }
  }

  return
}

/**
 * Get locale data.
 */
function getLocale (result: ScrapeResult): HtmlSnippetLocale | undefined {
  const primary = getJsonLdValue(result, ['rdfa', 0, 'http://ogp.me/ns#locale']) || getValue(result, ['html', 'language'])
  const alternate = getJsonLdArray(result, ['rdfa', 0, 'http://ogp.me/ns#locale:alternate'])

  if (primary || alternate) {
    return { primary, alternate }
  }

  return
}

/**
 * Get twitter data.
 */
function getTwitter (result: ScrapeResult): HtmlSnippetTwitter | undefined {
  const creatorId = getValue(result, ['twitter', 'creator:id'])
  const creatorHandle = getTwitterHandle(result, ['twitter', 'creator'])
  const siteId = getValue(result, ['twitter', 'site:id'])
  const siteHandle = getTwitterHandle(result, ['twitter', 'site'])

  if (siteId || siteHandle || creatorId || creatorHandle) {
    return {
      siteId,
      siteHandle,
      creatorId,
      creatorHandle
    }
  }

  return
}

/**
 * Extract/normalize the twitter handle.
 */
function getTwitterHandle (result: ScrapeResult, path: Path) {
  const value = getValue(result, path)

  if (value) {
    // Normalize twitter handles.
    return value.replace(/^@/, '')
  }

  return
}

/**
 * Get the TTL of the page.
 */
function getTtl (result: ScrapeResult): number | undefined {
  return toNumber(getJsonLdValue(result, ['rdfa', 0, 'http://ogp.me/ns#ttl'])) ||
    toNumber(getValue(result, ['oembed', 'cache_age']))
}

/**
 * Retrieve a URL for embedding an interactive widget.
 */
function getPlayer (result: ScrapeResult): HtmlSnippetPlayer | undefined {
  const isPlayer = getValue(result, ['twitter', 'card']) === 'player'

  if (!isPlayer) {
    return
  }

  const url = getValue(result, ['twitter', 'player'])
  const width = toNumber(getValue(result, ['twitter', 'player:width']))
  const height = toNumber(getValue(result, ['twitter', 'player:height']))
  const streamUrl = getValue(result, ['twitter', 'player:stream'])
  const streamContentType = getValue(result, ['twitter', 'player:stream:content_type'])

  if (url && width && height) {
    return {
      url,
      width,
      height,
      streamUrl,
      streamContentType
    }
  }

  return
}

/**
 * Retrieve the selected snippet icon.
 */
function getIcon (result: ScrapeResult, options: ExtractOptions): HtmlSnippetIcon | undefined {
  const preferredSize = Number(options.preferredIconSize) || 32
  const icons = result.icons || []
  let selectedSize: number | undefined
  let selectedIcon: HtmlSnippetIcon | undefined

  for (const icon of icons) {
    if (selectedSize == null) {
      selectedIcon = icon
    }

    if (icon.sizes) {
      const size = parseInt(icon.sizes, 10) // "32x32" -> "32".

      if (selectedSize == null) {
        selectedIcon = icon
        selectedSize = size
      } else {
        if (Math.abs(preferredSize - size) < Math.abs(selectedSize - size)) {
          selectedIcon = icon
          selectedSize = size
        }
      }
    } else {
      selectedIcon = selectedIcon || icon
    }
  }

  return selectedIcon
}

/**
 * Extract HTML page content types.
 */
function getEntity (result: ScrapeResult): Entity | undefined {
  const twitterType = getValue(result, ['twitter', 'card'])
  const ogpType = getJsonLdValue(result, ['rdfa', 0, 'http://ogp.me/ns#type'])
  const oembedType = getValue(result, ['oembed', 'type'])

  if (ogpType === 'article') {
    return {
      type: 'article',
      section: getJsonLdValue(result, ['rdfa', 0, 'http://ogp.me/ns/article#section']),
      publisher: getJsonLdValue(result, ['rdfa', 0, 'http://ogp.me/ns/article#publisher']),
      datePublished: toDate(getJsonLdValue(result, ['rdfa', 0, 'http://ogp.me/ns/article#published_time'])),
      dateExpires: toDate(getJsonLdValue(result, ['rdfa', 0, 'http://ogp.me/ns/article#expiration_time'])),
      dateModified: toDate(getJsonLdValue(result, ['rdfa', 0, 'http://ogp.me/ns/article#modified_time']))
    }
  }

  if (oembedType === 'video') {
    return {
      type: 'video',
      html: getValue(result, ['oembed', 'html']),
      width: toNumber(getValue(result, ['oembed', 'width'])),
      height: toNumber(getValue(result, ['oembed', 'height']))
    }
  }

  if (oembedType === 'rich') {
    return {
      type: 'rich',
      html: getValue(result, ['oembed', 'html']),
      width: toNumber(getValue(result, ['oembed', 'width'])),
      height: toNumber(getValue(result, ['oembed', 'height']))
    }
  }

  if (
    twitterType === 'summary_large_image' ||
    twitterType === 'photo' ||
    twitterType === 'gallery' ||
    oembedType === 'photo'
  ) {
    return {
      type: 'image',
      url: getValue(result, ['oembed', 'url']),
      width: toNumber(getValue(result, ['oembed', 'width'])),
      height: toNumber(getValue(result, ['oembed', 'height']))
    }
  }

  return
}
