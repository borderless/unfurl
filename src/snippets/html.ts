import { Path } from 'getvalue'

import {
  getUrl,
  getDate,
  getNumber,
  getString,
  getArray,
  toNumber,
  assignProps
} from '../utils'

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
  Options
} from '../interfaces'

export default function (result: ScrapeResult, options: Options): HtmlSnippet {
  return {
    type: 'html',
    image: getImage(result),
    video: getVideo(result),
    audio: getAudio(result),
    player: getPlayer(result),
    entity: getEntity(result),
    contentUrl: getContentUrl(result),
    contentSize: result.contentSize,
    originalUrl: result.originalUrl,
    encodingFormat: result.encodingFormat,
    determiner: getDeterminer(result),
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
function getContentUrl (result: ScrapeResult) {
  return getUrl(result, ['twitter', 'url'], result.contentUrl) ||
    getUrl(result, ['rdfa', '', 'http://ogp.me/ns#url'], result.contentUrl) ||
    getUrl(result, ['html', 'canonical'], result.contentUrl) ||
    getUrl(result, ['applinks', 'web:url'], result.contentUrl) ||
    getUrl(result, ['oembed', 'url'], result.contentUrl) ||
    result.contentUrl
}

/**
 * Get the metadata author.
 */
function getAuthor (result: ScrapeResult) {
  const name = getString(result, ['html', 'author']) ||
    getString(result, ['oembed', 'author_name']) ||
    getString(result, ['rdfa', '', 'http://ogp.me/ns/article#author']) ||
    getString(result, ['rdfa', '', 'https://creativecommons.org/ns#attributionName']) ||
    getString(result, ['sailthru', 'author'])

  const url = getString(result, ['oembed', 'author_url'])

  return { name, url }
}

/**
 * Get tags from metadata.
 */
function getTags (result: ScrapeResult): string[] {
  const htmlKeywords = getString(result, ['html', 'keywords'])

  if (htmlKeywords) {
    return htmlKeywords.split(/ *, */)
  }

  const metaTags = getArray(result, ['rdfa', '', 'http://ogp.me/ns#video:tag'])

  if (metaTags) {
    return metaTags
  }
}

/**
 * Get the name of the site.
 */
function getProvider (result: ScrapeResult) {
  const name = getString(result, ['rdfa', '', 'http://ogp.me/ns#site_name']) ||
    getString(result, ['oembed', 'provider_name']) ||
    getString(result, ['html', 'application-name']) ||
    getString(result, ['html', 'apple-mobile-web-app-title']) ||
    getString(result, ['twitter', 'app:name:iphone']) ||
    getString(result, ['twitter', 'app:name:ipad']) ||
    getString(result, ['twitter', 'app:name:googleplay']) ||
    getString(result, ['applinks', 'ios:app_name']) ||
    getString(result, ['applinks', 'ipad:app_name']) ||
    getString(result, ['applinks', 'iphone:app_name']) ||
    getString(result, ['twitter', 'android:app_name'])

  const url = getString(result, ['oembed', 'provider_url'])

  return { name, url }
}

/**
 * Get the headline from the site.
 */
function getHeadline (result: ScrapeResult) {
  return getString(result, ['twitter', 'title']) ||
    getString(result, ['oembed', 'title']) ||
    getString(result, ['rdfa', '', 'http://ogp.me/ns#title']) ||
    getString(result, ['rdfa', '', 'http://purl.org/dc/terms/title']) ||
    getString(result, ['html', 'title'])
}

/**
 * Get the caption from the site.
 */
function getDescription (result: ScrapeResult) {
  return getString(result, ['rdfa', '', 'http://ogp.me/ns#description']) ||
    getString(result, ['oembed', 'summary']) ||
    getString(result, ['twitter', 'description']) ||
    getString(result, ['html', 'description'])
}

/**
 * Get the meta image url.
 */
function getImage (result: ScrapeResult): HtmlSnippetImage | HtmlSnippetImage[] {
  const ogpImages = getArray(result, ['rdfa', '', 'http://ogp.me/ns#image']) ||
    getArray(result, ['rdfa', '', 'http://ogp.me/ns#image:url'])
  const twitterImages = getArray(result, ['twitter', 'image']) || getArray(result, ['twitter', 'image0'])
  const images: HtmlSnippetImage[] = []

  function addImage (newImage: HtmlSnippetImage, append: boolean) {
    for (const image of images) {
      if (image.url === newImage.url) {
        assignProps(image, newImage)
        return
      }
    }

    if (append) {
      images.push(newImage)
    }
  }

  function addImages (
    urls: string[],
    secureUrls: string[],
    types: string[],
    alts: string[],
    widths: string[],
    heights: string[],
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
    const ogpTypes = getArray(result, ['rdfa', '', 'http://ogp.me/ns#image:type'])
    const ogpWidths = getArray(result, ['rdfa', '', 'http://ogp.me/ns#image:width'])
    const ogpHeights = getArray(result, ['rdfa', '', 'http://ogp.me/ns#image:height'])
    const ogpSecureUrls = getArray(result, ['rdfa', '', 'http://ogp.me/ns#image:secure_url'])

    addImages(ogpImages, ogpSecureUrls, ogpTypes, null, ogpWidths, ogpHeights, true)
  }

  if (twitterImages) {
    const twitterAlts = getArray(result, ['twitter', 'image:alt'])
    const twitterWidths = getArray(result, ['twitter', 'image:width'])
    const twitterHeights = getArray(result, ['twitter', 'image:height'])

    addImages(twitterImages, null, null, twitterAlts, twitterWidths, twitterHeights, !ogpImages)
  }

  return images.length > 1 ? images : images[0]
}

/**
 * Get the meta audio information.
 */
function getAudio (result: ScrapeResult): HtmlSnippetAudio | HtmlSnippetAudio[] {
  const ogpAudios = getArray(result, ['rdfa', '', 'http://ogp.me/ns#audio']) ||
    getArray(result, ['rdfa', '', 'http://ogp.me/ns#audio:url'])
  const audios: HtmlSnippetAudio[] = []

  function addAudio (newAudio: HtmlSnippetAudio) {
    for (const audio of audios) {
      if (audio.url === newAudio.url) {
        assignProps(audio, newAudio)
        return
      }
    }

    audios.push(newAudio)
  }

  function addAudios (urls: string[], secureUrls: string[], types: string[]) {
    for (let i = 0; i < urls.length; i++) {
      addAudio({
        url: urls[i],
        secureUrl: secureUrls ? secureUrls[i] : undefined,
        type: types ? types[i] : undefined
      })
    }
  }

  if (ogpAudios) {
    const ogpTypes = getArray(result, ['rdfa', '', 'http://ogp.me/ns#audio:type'])
    const ogpSecureUrls = getArray(result, ['rdfa', '', 'http://ogp.me/ns#audio:secure_url'])

    addAudios(ogpAudios, ogpSecureUrls, ogpTypes)
  }

  return audios.length > 1 ? audios : audios[0]
}

/**
 * Get the meta image url.
 */
function getVideo (result: ScrapeResult): HtmlSnippetVideo | HtmlSnippetVideo[] {
  const ogpVideos = getArray(result, ['rdfa', '', 'http://ogp.me/ns#video']) ||
    getArray(result, ['rdfa', '', 'http://ogp.me/ns#video:url'])
  const videos: HtmlSnippetVideo[] = []

  function addVideo (newVideo: HtmlSnippetVideo) {
    for (const video of videos) {
      if (video.url === newVideo.url) {
        assignProps(video, newVideo)
        return
      }
    }

    videos.push(newVideo)
  }

  function addVideos (
    urls: string[],
    secureUrls: string[],
    types: string[],
    widths: string[],
    heights: string[]
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
    const ogpTypes = getArray(result, ['rdfa', '', 'http://ogp.me/ns#video:type'])
    const ogpWidths = getArray(result, ['rdfa', '', 'http://ogp.me/ns#video:width'])
    const ogpHeights = getArray(result, ['rdfa', '', 'http://ogp.me/ns#video:height'])
    const ogpSecureUrls = getArray(result, ['rdfa', '', 'http://ogp.me/ns#video:secure_url'])

    addVideos(ogpVideos, ogpSecureUrls, ogpTypes, ogpWidths, ogpHeights)
  }

  return videos.length > 1 ? videos : videos[0]
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
function getIpadApp (result: ScrapeResult): HtmlSnippetAppLink {
  const twitterIpadUrl = getString(result, ['twitter', 'app:url:ipad'])
  const twitterIpadId = getString(result, ['twitter', 'app:id:ipad'])
  const twitterIpadName = getString(result, ['twitter', 'app:name:ipad'])

  if (twitterIpadId && twitterIpadName && twitterIpadUrl) {
    return {
      id: twitterIpadId,
      name: twitterIpadName,
      url: twitterIpadUrl
    }
  }

  const applinksIpadUrl = getString(result, ['applinks', 'ipad:url'])
  const applinksIpadId = getString(result, ['applinks', 'ipad:app_store_id'])
  const applinksIpadName = getString(result, ['applinks', 'ipad:app_name'])

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
function getIphoneApp (result: ScrapeResult): HtmlSnippetAppLink {
  const twitterIphoneUrl = getString(result, ['twitter', 'app:url:iphone'])
  const twitterIphoneId = getString(result, ['twitter', 'app:id:iphone'])
  const twitterIphoneName = getString(result, ['twitter', 'app:name:iphone'])

  if (twitterIphoneId && twitterIphoneName && twitterIphoneUrl) {
    return {
      id: twitterIphoneId,
      name: twitterIphoneName,
      url: twitterIphoneUrl
    }
  }

  const applinksIphoneUrl = getString(result, ['applinks', 'iphone:url'])
  const applinksIphoneId = getString(result, ['applinks', 'iphone:app_store_id'])
  const applinksIphoneName = getString(result, ['applinks', 'iphone:app_name'])

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
function getIosApp (result: ScrapeResult): HtmlSnippetAppLink {
  const applinksUrl = getString(result, ['applinks', 'ios:url'])
  const applinksId = getString(result, ['applinks', 'ios:app_store_id'])
  const applinksName = getString(result, ['applinks', 'ios:app_name'])

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
function getAndroidApp (result: ScrapeResult): HtmlSnippetAppLink {
  const twitterAndroidUrl = getString(result, ['twitter', 'app:url:googleplay'])
  const twitterAndroidId = getString(result, ['twitter', 'app:id:googleplay'])
  const twitterAndroidName = getString(result, ['twitter', 'app:name:googleplay'])

  if (twitterAndroidId && twitterAndroidName && twitterAndroidUrl) {
    return {
      id: twitterAndroidId,
      name: twitterAndroidName,
      url: twitterAndroidUrl
    }
  }

  const applinksAndroidUrl = getString(result, ['applinks', 'android:url'])
  const applinksAndroidId = getString(result, ['applinks', 'android:package'])
  const applinksAndroidName = getString(result, ['applinks', 'android:app_name'])

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
function getWindowsPhoneApp (result: ScrapeResult): HtmlSnippetAppLink {
  const applinksWindowsPhoneUrl = getString(result, ['applinks', 'windows_phone:url'])
  const applinksWindowsPhoneId = getString(result, ['applinks', 'windows_phone:app_id'])
  const applinksWindowsPhoneName = getString(result, ['applinks', 'windows_phone:app_name'])

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
function getWindowsApp (result: ScrapeResult): HtmlSnippetAppLink {
  const applinksWindowsUrl = getString(result, ['applinks', 'windows:url'])
  const applinksWindowsId = getString(result, ['applinks', 'windows:app_id'])
  const applinksWindowsName = getString(result, ['applinks', 'windows:app_name'])

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
function getWindowsUniversalApp (result: ScrapeResult): HtmlSnippetAppLink {
  const applinksWindowsUniversalUrl = getString(result, ['applinks', 'windows_universal:url'])
  const applinksWindowsUniversalId = getString(result, ['applinks', 'windows_universal:app_id'])
  const applinksWindowsUniversalName = getString(result, ['applinks', 'windows_universal:app_name'])

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
function getLocale (result: ScrapeResult): HtmlSnippetLocale {
  const primary = getString(result, ['rdfa', '', 'http://ogp.me/ns#locale'])
  const alternate = getArray(result, ['rdfa', '', 'http://ogp.me/ns#locale:alternate'])

  if (primary || alternate) {
    return { primary, alternate }
  }
}

/**
 * Get twitter data.
 */
function getTwitter (result: ScrapeResult): HtmlSnippetTwitter {
  const creatorId = getString(result, ['twitter', 'creator:id'])
  const creatorHandle = getTwitterHandle(result, ['twitter', 'creator'])
  const siteId = getString(result, ['twitter', 'site:id'])
  const siteHandle = getTwitterHandle(result, ['twitter', 'site'])

  if (siteId || siteHandle || creatorId || creatorHandle) {
    return {
      siteId,
      siteHandle,
      creatorId,
      creatorHandle
    }
  }
}

/**
 * Extract/normalize the twitter handle.
 */
function getTwitterHandle (result: ScrapeResult, path: Path) {
  const value = getString(result, path)

  if (value) {
    // Normalize twitter handles.
    return value.replace(/^@/, '')
  }
}

/**
 * Get the TTL of the page.
 */
function getTtl (result: ScrapeResult): number {
  return getNumber(result, ['rdfa', '', 'http://ogp.me/ns#ttl']) ||
    getNumber(result, ['oembed', 'cache_age'])
}

/**
 * Get the object determiner.
 */
function getDeterminer (result: ScrapeResult): string {
  return getString(result, ['rdfa', '', 'http://ogp.me/ns#determiner'])
}

/**
 * Retrieve a URL for embedding an interactive widget.
 */
function getPlayer (result: ScrapeResult): HtmlSnippetPlayer {
  const isPlayer = getString(result, ['twitter', 'card']) === 'player'

  if (!isPlayer) {
    return
  }

  const url = getString(result, ['twitter', 'player'])
  const width = getNumber(result, ['twitter', 'player:width'])
  const height = getNumber(result, ['twitter', 'player:height'])
  const streamUrl = getString(result, ['twitter', 'player:stream'])
  const streamContentType = getString(result, ['twitter', 'player:stream:content_type'])

  if (url && width && height) {
    return {
      url,
      width,
      height,
      streamUrl,
      streamContentType
    }
  }
}

/**
 * Retrieve the selected snippet icon.
 */
function getIcon (result: ScrapeResult, options: Options): HtmlSnippetIcon {
  const preferredSize = Number(options.preferredIconSize) || 32
  let selectedSize: number
  let selectedIcon: HtmlSnippetIcon

  if (result.html && result.html.icons) {
    for (const icon of result.html.icons) {
      if (selectedSize == null) {
        selectedIcon = icon
      }

      if (icon.sizes) {
        const size = parseInt(icon.sizes, 10) // "32x32".

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
  }

  return selectedIcon
}

/**
 * Extract HTML page content types.
 */
function getEntity (result: ScrapeResult): Entity {
  const twitterType = getString(result, ['twitter', 'card'])
  const ogpType = getString(result, ['rdfa', '', 'http://ogp.me/ns#type'])
  const oembedType = getString(result, ['oembed', 'type'])

  if (ogpType === 'article') {
    return {
      type: 'article',
      section: getString(result, ['rdfa', '', 'http://ogp.me/ns/article#section']),
      publisher: getString(result, ['rdfa', '', 'http://ogp.me/ns/article#publisher']),
      datePublished: getDate(result, ['rdfa', '', 'http://ogp.me/ns/article#published_time']),
      dateExpires: getDate(result, ['rdfa', '', 'http://ogp.me/ns/article#expiration_time']),
      dateModified: getDate(result, ['rdfa', '', 'http://ogp.me/ns/article#modified_time'])
    }
  }

  if (oembedType === 'video') {
    return {
      type: 'video',
      html: getString(result, ['oembed', 'html']),
      width: getNumber(result, ['oembed', 'width']),
      height: getNumber(result, ['oembed', 'height'])
    }
  }

  if (oembedType === 'rich') {
    return {
      type: 'rich',
      html: getString(result, ['oembed', 'html']),
      width: getNumber(result, ['oembed', 'width']),
      height: getNumber(result, ['oembed', 'height'])
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
      url: getString(result, ['oembed', 'url']),
      width: getNumber(result, ['oembed', 'width']),
      height: getNumber(result, ['oembed', 'height'])
    }
  }
}
