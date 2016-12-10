import { Path } from 'getvalue'
import { HtmlContent } from '../scrapers/html'

import {
  ScrapeResult,
  Entity,
  HtmlSnippet,
  HtmlSnippetImage,
  HtmlSnippetAppLink,
  HtmlSnippetApps,
  HtmlSnippetAudio,
  HtmlSnippetLocale,
  HtmlSnippetPlayer,
  HtmlSnippetVideo,
  HtmlSnippetTwitter,
  HtmlSnippetIcon,
  ExtractOptions
} from '../interfaces'

import {
  getArray,
  getDate,
  getString,
  getNumber,
  getUrl,
  copyProps,
  toNumber,
  toString,
  JsonLdValue
} from '../support'

export default function (result: ScrapeResult<HtmlContent>, options: ExtractOptions): HtmlSnippet {
  const { content, contentUrl } = result

  return {
    type: 'html',
    image: getImage(content),
    video: getVideo(content),
    audio: getAudio(content),
    player: getPlayer(content),
    entity: getEntity(content),
    contentUrl: result.contentUrl,
    contentSize: result.contentSize,
    canonicalUrl: getCanonicalUrl(content, contentUrl),
    encodingFormat: result.encodingFormat,
    determiner: getDeterminer(content),
    headline: getHeadline(content),
    description: getDescription(content),
    provider: getProvider(content),
    author: getAuthor(content),
    ttl: getTtl(content),
    icon: getIcon(content, options),
    tags: getTags(content),
    locale: getLocale(content),
    twitter: getTwitter(content),
    apps: getApps(content)
  }
}

/**
 * Get the canonical URL from the metadata.
 */
function getCanonicalUrl (content: HtmlContent, contentUrl: string) {
  return getUrl(content, ['twitter', 'url'], contentUrl) ||
    getUrl(content, ['rdfa', 0, 'http://ogp.me/ns#url'], contentUrl) ||
    getUrl(content, ['html', 'canonical'], contentUrl) ||
    getUrl(content, ['applinks', 'web:url'], contentUrl) ||
    getUrl(content, ['oembed', 'url'], contentUrl)
}

/**
 * Get the metadata author.
 */
function getAuthor (content: HtmlContent) {
  const name = getString(content, ['html', 'author']) ||
    getString(content, ['oembed', 'author_name']) ||
    getString(content, ['rdfa', 0, 'http://ogp.me/ns/article#author']) ||
    getString(content, ['rdfa', 0, 'https://creativecommons.org/ns#attributionName']) ||
    getString(content, ['sailthru', 'author'])

  const url = getString(content, ['oembed', 'author_url'])

  return { name, url }
}

/**
 * Get tags from metadata.
 */
function getTags (content: HtmlContent): string[] | undefined {
  const htmlKeywords = getString(content, ['html', 'keywords'])

  if (htmlKeywords) {
    return htmlKeywords.split(/ *, */)
  }

  const metaTags = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#video:tag'])

  if (metaTags) {
    return metaTags
  }

  return
}

/**
 * Get the name of the site.
 */
function getProvider (content: HtmlContent) {
  const name = getString(content, ['rdfa', 0, 'http://ogp.me/ns#site_name']) ||
    getString(content, ['oembed', 'provider_name']) ||
    getString(content, ['html', 'application-name']) ||
    getString(content, ['html', 'apple-mobile-web-app-title']) ||
    getString(content, ['twitter', 'app:name:iphone']) ||
    getString(content, ['twitter', 'app:name:ipad']) ||
    getString(content, ['twitter', 'app:name:googleplay']) ||
    getString(content, ['applinks', 'ios:app_name']) ||
    getString(content, ['applinks', 'ipad:app_name']) ||
    getString(content, ['applinks', 'iphone:app_name']) ||
    getString(content, ['twitter', 'android:app_name'])

  const url = getString(content, ['oembed', 'provider_url'])

  return { name, url }
}

/**
 * Get the headline from the site.
 */
function getHeadline (content: HtmlContent) {
  return getString(content, ['twitter', 'title']) ||
    getString(content, ['oembed', 'title']) ||
    getString(content, ['rdfa', 0, 'http://ogp.me/ns#title']) ||
    getString(content, ['rdfa', 0, 'http://purl.org/dc/terms/title']) ||
    getString(content, ['html', 'title'])
}

/**
 * Get the caption from the site.
 */
function getDescription (content: HtmlContent) {
  return getString(content, ['rdfa', 0, 'http://ogp.me/ns#description']) ||
    getString(content, ['oembed', 'summary']) ||
    getString(content, ['twitter', 'description']) ||
    getString(content, ['html', 'description'])
}

/**
 * Get the meta image url.
 */
function getImage (content: HtmlContent): HtmlSnippetImage | HtmlSnippetImage[] {
  const ogpImages = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#image']) ||
    getArray(content, ['rdfa', 0, 'http://ogp.me/ns#image:url'])
  const twitterImages = getArray(content, ['twitter', 'image']) || getArray(content, ['twitter', 'image0'])
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
    urls: string[] | JsonLdValue[],
    secureUrls: string[] | JsonLdValue[] | undefined,
    types: string[] | JsonLdValue[] | undefined,
    alts: string[] | JsonLdValue[] | undefined,
    widths: string[] | JsonLdValue[] | undefined,
    heights: string[] | JsonLdValue[] | undefined,
    append: boolean
  ) {
    for (let i = 0; i < urls.length; i++) {
      addImage(
        {
          url: toString(urls[i]) as string,
          secureUrl: secureUrls ? toString(secureUrls[i]) : undefined,
          type: types ? toString(types[i]) : undefined,
          alt: alts ? toString(alts[i]) : undefined,
          width: widths ? toNumber(widths[i]) : undefined,
          height: heights ? toNumber(heights[i]) : undefined
        },
        append
      )
    }
  }

  if (ogpImages) {
    const ogpTypes = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#image:type'])
    const ogpWidths = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#image:width'])
    const ogpHeights = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#image:height'])
    const ogpSecureUrls = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#image:secure_url'])

    addImages(ogpImages, ogpSecureUrls, ogpTypes, undefined, ogpWidths, ogpHeights, true)
  }

  if (twitterImages) {
    const twitterAlts = getArray(content, ['twitter', 'image:alt'])
    const twitterWidths = getArray(content, ['twitter', 'image:width'])
    const twitterHeights = getArray(content, ['twitter', 'image:height'])

    addImages(twitterImages, undefined, undefined, twitterAlts, twitterWidths, twitterHeights, !ogpImages)
  }

  return images.length > 1 ? images : images[0]
}

/**
 * Get the meta audio information.
 */
function getAudio (content: HtmlContent): HtmlSnippetAudio | HtmlSnippetAudio[] {
  const ogpAudios = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#audio']) ||
    getArray(content, ['rdfa', 0, 'http://ogp.me/ns#audio:url'])
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
    const ogpTypes = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#audio:type'])
    const ogpSecureUrls = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#audio:secure_url'])

    addAudios(ogpAudios, ogpSecureUrls, ogpTypes)
  }

  return audios.length > 1 ? audios : audios[0]
}

/**
 * Get the meta image url.
 */
function getVideo (content: HtmlContent): HtmlSnippetVideo | HtmlSnippetVideo[] {
  const ogpVideos = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#video']) ||
    getArray(content, ['rdfa', 0, 'http://ogp.me/ns#video:url'])
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
    const ogpTypes = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#video:type'])
    const ogpWidths = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#video:width'])
    const ogpHeights = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#video:height'])
    const ogpSecureUrls = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#video:secure_url'])

    addVideos(ogpVideos, ogpSecureUrls, ogpTypes, ogpWidths, ogpHeights)
  }

  return videos.length > 1 ? videos : videos[0]
}

/**
 * Get apps metadata.
 */
function getApps (content: HtmlContent): HtmlSnippetApps {
  return {
    iphone: getIphoneApp(content),
    ipad: getIpadApp(content),
    android: getAndroidApp(content),
    windows: getWindowsApp(content),
    windowsPhone: getWindowsPhoneApp(content)
  }
}

/**
 * Extract iPad app information from metadata.
 */
function getIpadApp (content: HtmlContent): HtmlSnippetAppLink | undefined {
  const twitterIpadUrl = getString(content, ['twitter', 'app:url:ipad'])
  const twitterIpadId = getString(content, ['twitter', 'app:id:ipad'])
  const twitterIpadName = getString(content, ['twitter', 'app:name:ipad'])

  if (twitterIpadId && twitterIpadName && twitterIpadUrl) {
    return {
      id: twitterIpadId,
      name: twitterIpadName,
      url: twitterIpadUrl
    }
  }

  const applinksIpadUrl = getString(content, ['applinks', 'ipad:url'])
  const applinksIpadId = getString(content, ['applinks', 'ipad:app_store_id'])
  const applinksIpadName = getString(content, ['applinks', 'ipad:app_name'])

  if (applinksIpadId && applinksIpadName && applinksIpadUrl) {
    return {
      id: applinksIpadId,
      name: applinksIpadName,
      url: applinksIpadUrl
    }
  }

  return getIosApp(content)
}

/**
 * Extract iPhone app information from metadata.
 */
function getIphoneApp (content: HtmlContent): HtmlSnippetAppLink | undefined {
  const twitterIphoneUrl = getString(content, ['twitter', 'app:url:iphone'])
  const twitterIphoneId = getString(content, ['twitter', 'app:id:iphone'])
  const twitterIphoneName = getString(content, ['twitter', 'app:name:iphone'])

  if (twitterIphoneId && twitterIphoneName && twitterIphoneUrl) {
    return {
      id: twitterIphoneId,
      name: twitterIphoneName,
      url: twitterIphoneUrl
    }
  }

  const applinksIphoneUrl = getString(content, ['applinks', 'iphone:url'])
  const applinksIphoneId = getString(content, ['applinks', 'iphone:app_store_id'])
  const applinksIphoneName = getString(content, ['applinks', 'iphone:app_name'])

  if (applinksIphoneId && applinksIphoneName && applinksIphoneUrl) {
    return {
      id: applinksIphoneId,
      name: applinksIphoneName,
      url: applinksIphoneUrl
    }
  }

  return getIosApp(content)
}

/**
 * Extract the iOS app metadata.
 */
function getIosApp (content: HtmlContent): HtmlSnippetAppLink | undefined {
  const applinksUrl = getString(content, ['applinks', 'ios:url'])
  const applinksId = getString(content, ['applinks', 'ios:app_store_id'])
  const applinksName = getString(content, ['applinks', 'ios:app_name'])

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
function getAndroidApp (content: HtmlContent): HtmlSnippetAppLink | undefined {
  const twitterAndroidUrl = getString(content, ['twitter', 'app:url:googleplay'])
  const twitterAndroidId = getString(content, ['twitter', 'app:id:googleplay'])
  const twitterAndroidName = getString(content, ['twitter', 'app:name:googleplay'])

  if (twitterAndroidId && twitterAndroidName && twitterAndroidUrl) {
    return {
      id: twitterAndroidId,
      name: twitterAndroidName,
      url: twitterAndroidUrl
    }
  }

  const applinksAndroidUrl = getString(content, ['applinks', 'android:url'])
  const applinksAndroidId = getString(content, ['applinks', 'android:package'])
  const applinksAndroidName = getString(content, ['applinks', 'android:app_name'])

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
function getWindowsPhoneApp (content: HtmlContent): HtmlSnippetAppLink | undefined {
  const applinksWindowsPhoneUrl = getString(content, ['applinks', 'windows_phone:url'])
  const applinksWindowsPhoneId = getString(content, ['applinks', 'windows_phone:app_id'])
  const applinksWindowsPhoneName = getString(content, ['applinks', 'windows_phone:app_name'])

  if (applinksWindowsPhoneId && applinksWindowsPhoneName && applinksWindowsPhoneUrl) {
    return {
      id: applinksWindowsPhoneId,
      name: applinksWindowsPhoneName,
      url: applinksWindowsPhoneUrl
    }
  }

  return getWindowsUniversalApp(content)
}

/**
 * Extract Windows app metadata.
 */
function getWindowsApp (content: HtmlContent): HtmlSnippetAppLink | undefined {
  const applinksWindowsUrl = getString(content, ['applinks', 'windows:url'])
  const applinksWindowsId = getString(content, ['applinks', 'windows:app_id'])
  const applinksWindowsName = getString(content, ['applinks', 'windows:app_name'])

  if (applinksWindowsId && applinksWindowsName && applinksWindowsUrl) {
    return {
      id: applinksWindowsId,
      name: applinksWindowsName,
      url: applinksWindowsUrl
    }
  }

  return getWindowsUniversalApp(content)
}

/**
 * Extract Windows Universal app metadata.
 */
function getWindowsUniversalApp (content: HtmlContent): HtmlSnippetAppLink | undefined {
  const applinksWindowsUniversalUrl = getString(content, ['applinks', 'windows_universal:url'])
  const applinksWindowsUniversalId = getString(content, ['applinks', 'windows_universal:app_id'])
  const applinksWindowsUniversalName = getString(content, ['applinks', 'windows_universal:app_name'])

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
function getLocale (content: HtmlContent): HtmlSnippetLocale | undefined {
  const primary = getString(content, ['rdfa', 0, 'http://ogp.me/ns#locale'])
  const alternate = getArray(content, ['rdfa', 0, 'http://ogp.me/ns#locale:alternate'])

  if (primary || alternate) {
    return { primary, alternate }
  }

  return
}

/**
 * Get twitter data.
 */
function getTwitter (content: HtmlContent): HtmlSnippetTwitter | undefined {
  const creatorId = getString(content, ['twitter', 'creator:id'])
  const creatorHandle = getTwitterHandle(content, ['twitter', 'creator'])
  const siteId = getString(content, ['twitter', 'site:id'])
  const siteHandle = getTwitterHandle(content, ['twitter', 'site'])

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
function getTwitterHandle (content: HtmlContent, path: Path) {
  const value = getString(content, path)

  if (value) {
    // Normalize twitter handles.
    return value.replace(/^@/, '')
  }

  return
}

/**
 * Get the TTL of the page.
 */
function getTtl (content: HtmlContent): number | undefined {
  return getNumber(content, ['rdfa', 0, 'http://ogp.me/ns#ttl']) ||
    getNumber(content, ['oembed', 'cache_age'])
}

/**
 * Get the object determiner.
 */
function getDeterminer (content: HtmlContent): string | undefined {
  return getString(content, ['rdfa', 0, 'http://ogp.me/ns#determiner'])
}

/**
 * Retrieve a URL for embedding an interactive widget.
 */
function getPlayer (content: HtmlContent): HtmlSnippetPlayer | undefined {
  const isPlayer = getString(content, ['twitter', 'card']) === 'player'

  if (!isPlayer) {
    return
  }

  const url = getString(content, ['twitter', 'player'])
  const width = getNumber(content, ['twitter', 'player:width'])
  const height = getNumber(content, ['twitter', 'player:height'])
  const streamUrl = getString(content, ['twitter', 'player:stream'])
  const streamContentType = getString(content, ['twitter', 'player:stream:content_type'])

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
function getIcon (content: HtmlContent, options: ExtractOptions): HtmlSnippetIcon | undefined {
  const preferredSize = Number(options.preferredIconSize) || 32
  let selectedSize: number | undefined
  let selectedIcon: HtmlSnippetIcon | undefined

  for (const icon of content.favicons) {
    if (selectedSize == null) {
      selectedIcon = icon
    }

    if (icon.size) {
      const size = parseInt(icon.size, 10) // "32x32" -> "32".

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
function getEntity (content: HtmlContent): Entity | undefined {
  const twitterType = getString(content, ['twitter', 'card'])
  const ogpType = getString(content, ['rdfa', 0, 'http://ogp.me/ns#type'])
  const oembedType = getString(content, ['oembed', 'type'])

  if (ogpType === 'article') {
    return {
      type: 'article',
      section: getString(content, ['rdfa', 0, 'http://ogp.me/ns/article#section']),
      publisher: getString(content, ['rdfa', 0, 'http://ogp.me/ns/article#publisher']),
      datePublished: getDate(content, ['rdfa', 0, 'http://ogp.me/ns/article#published_time']),
      dateExpires: getDate(content, ['rdfa', 0, 'http://ogp.me/ns/article#expiration_time']),
      dateModified: getDate(content, ['rdfa', 0, 'http://ogp.me/ns/article#modified_time'])
    }
  }

  if (oembedType === 'video') {
    return {
      type: 'video',
      html: getString(content, ['oembed', 'html']),
      width: getNumber(content, ['oembed', 'width']),
      height: getNumber(content, ['oembed', 'height'])
    }
  }

  if (oembedType === 'rich') {
    return {
      type: 'rich',
      html: getString(content, ['oembed', 'html']),
      width: getNumber(content, ['oembed', 'width']),
      height: getNumber(content, ['oembed', 'height'])
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
      url: getString(content, ['oembed', 'url']),
      width: getNumber(content, ['oembed', 'width']),
      height: getNumber(content, ['oembed', 'height'])
    }
  }

  return
}
