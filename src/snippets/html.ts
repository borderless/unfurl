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
  HtmlResult,
  HtmlResultMeta,
  HtmlMainEntity,
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

export default function (result: HtmlResult, options: Options): HtmlSnippet {
  const { contentUrl, meta } = result

  return {
    type: 'html' as 'html',
    image: getMetaImage(meta, contentUrl),
    video: getMetaVideo(meta, contentUrl),
    audio: getMetaAudio(meta, contentUrl),
    player: getMetaPlayer(meta, contentUrl),
    mainEntity: getMetaMainEntity(meta, contentUrl),
    contentUrl: getMetaUrl(meta, contentUrl),
    contentSize: result.contentSize,
    originalUrl: result.originalUrl,
    encodingFormat: result.encodingFormat,
    determiner: getMetaDeterminer(meta),
    headline: getMetaHeadline(meta),
    description: getMetaDescription(meta),
    provider: getMetaProvider(meta),
    author: getMetaAuthor(meta),
    ttl: getMetaTtl(meta),
    icon: getMetaIcon(meta, options),
    tags: getMetaTags(meta),
    locale: getMetaLocale(meta),
    twitter: getMetaTwitter(meta),
    apps: getMetaApps(meta)
  }
}

/**
 * Get the canonical URL from the metadata.
 */
function getMetaUrl (meta: HtmlResultMeta, contentUrl: string) {
  return getUrl(meta, ['twitter', 'url'], contentUrl) ||
    getUrl(meta, ['rdfa', '', 'http://ogp.me/ns#url'], contentUrl) ||
    getUrl(meta, ['html', 'canonical'], contentUrl) ||
    getUrl(meta, ['applinks', 'web:url'], contentUrl) ||
    getUrl(meta, ['oembed', 'url'], contentUrl) ||
    contentUrl
}

/**
 * Get the metadata author.
 */
function getMetaAuthor (meta: HtmlResultMeta) {
  const name = getString(meta, ['html', 'author']) ||
    getString(meta, ['oembed', 'author_name']) ||
    getString(meta, ['rdfa', '', 'http://ogp.me/ns/article#author']) ||
    getString(meta, ['rdfa', '', 'https://creativecommons.org/ns#attributionName']) ||
    getString(meta, ['sailthru', 'author'])

  const url = getString(meta, ['oembed', 'author_url'])

  return { name, url }
}

/**
 * Get tags from metadata.
 */
function getMetaTags (meta: HtmlResultMeta): string[] {
  const htmlKeywords = getString(meta, ['html', 'keywords'])

  if (htmlKeywords) {
    return htmlKeywords.split(/ *, */)
  }

  const metaTags = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#video:tag'])

  if (metaTags) {
    return metaTags
  }
}

/**
 * Get the name of the site.
 */
function getMetaProvider (meta: HtmlResultMeta) {
  const name = getString(meta, ['rdfa', '', 'http://ogp.me/ns#site_name']) ||
    getString(meta, ['oembed', 'provider_name']) ||
    getString(meta, ['html', 'application-name']) ||
    getString(meta, ['html', 'apple-mobile-web-app-title']) ||
    getString(meta, ['twitter', 'app:name:iphone']) ||
    getString(meta, ['twitter', 'app:name:ipad']) ||
    getString(meta, ['twitter', 'app:name:googleplay']) ||
    getString(meta, ['applinks', 'ios:app_name']) ||
    getString(meta, ['applinks', 'ipad:app_name']) ||
    getString(meta, ['applinks', 'iphone:app_name']) ||
    getString(meta, ['twitter', 'android:app_name'])

  const url = getString(meta, ['oembed', 'provider_url'])

  return { name, url }
}

/**
 * Get the headline from the site.
 */
function getMetaHeadline (meta: HtmlResultMeta) {
  return getString(meta, ['twitter', 'title']) ||
    getString(meta, ['oembed', 'title']) ||
    getString(meta, ['rdfa', '', 'http://ogp.me/ns#title']) ||
    getString(meta, ['html', 'title'])
}

/**
 * Get the caption from the site.
 */
function getMetaDescription (meta: HtmlResultMeta) {
  return getString(meta, ['twitter', 'description']) ||
    getString(meta, ['rdfa', '', 'http://ogp.me/ns#description']) ||
    getString(meta, ['oembed', 'summary']) ||
    getString(meta, ['html', 'description'])
}

/**
 * Get the meta image url.
 */
function getMetaImage (meta: HtmlResultMeta, baseUrl: string): HtmlSnippetImage | HtmlSnippetImage[] {
  const ogpImages = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#image']) ||
    getArray(meta, ['rdfa', '', 'http://ogp.me/ns#image:url'])
  const twitterImages = getArray(meta, ['twitter', 'image']) || getArray(meta, ['twitter', 'image0'])
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
    const ogpTypes = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#image:type'])
    const ogpWidths = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#image:width'])
    const ogpHeights = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#image:height'])
    const ogpSecureUrls = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#image:secure_url'])

    addImages(ogpImages, ogpSecureUrls, ogpTypes, null, ogpWidths, ogpHeights, true)
  }

  if (twitterImages) {
    const twitterAlts = getArray(meta, ['twitter', 'image:alt'])
    const twitterWidths = getArray(meta, ['twitter', 'image:width'])
    const twitterHeights = getArray(meta, ['twitter', 'image:height'])

    addImages(twitterImages, null, null, twitterAlts, twitterWidths, twitterHeights, !ogpImages)
  }

  return images.length > 1 ? images : images[0]
}

/**
 * Get the meta audio information.
 */
function getMetaAudio (meta: HtmlResultMeta, baseUrl: string): HtmlSnippetAudio | HtmlSnippetAudio[] {
  const ogpAudios = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#audio']) ||
    getArray(meta, ['rdfa', '', 'http://ogp.me/ns#audio:url'])
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
    const ogpTypes = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#audio:type'])
    const ogpSecureUrls = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#audio:secure_url'])

    addAudios(ogpAudios, ogpSecureUrls, ogpTypes)
  }

  return audios.length > 1 ? audios : audios[0]
}

/**
 * Get the meta image url.
 */
function getMetaVideo (meta: HtmlResultMeta, baseUrl: string): HtmlSnippetVideo | HtmlSnippetVideo[] {
  const ogpVideos = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#video']) ||
    getArray(meta, ['rdfa', '', 'http://ogp.me/ns#video:url'])
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
    const ogpTypes = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#video:type'])
    const ogpWidths = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#video:width'])
    const ogpHeights = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#video:height'])
    const ogpSecureUrls = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#video:secure_url'])

    addVideos(ogpVideos, ogpSecureUrls, ogpTypes, ogpWidths, ogpHeights)
  }

  return videos.length > 1 ? videos : videos[0]
}

/**
 * Get apps metadata.
 */
function getMetaApps (meta: HtmlResultMeta): HtmlSnippetApps {
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
function getMetaIpadApp (meta: HtmlResultMeta): HtmlSnippetAppLink {
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
function getMetaIphoneApp (meta: HtmlResultMeta): HtmlSnippetAppLink {
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
function getMetaIosApp (meta: HtmlResultMeta): HtmlSnippetAppLink {
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
function getMetaAndroidApp (meta: HtmlResultMeta): HtmlSnippetAppLink {
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
function getMetaWindowsPhoneApp (meta: HtmlResultMeta): HtmlSnippetAppLink {
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
function getMetaWindowsApp (meta: HtmlResultMeta): HtmlSnippetAppLink {
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
function getMetaWindowsUniversalApp (meta: HtmlResultMeta): HtmlSnippetAppLink {
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
function getMetaLocale (meta: HtmlResultMeta): HtmlSnippetLocale {
  const primary = getString(meta, ['rdfa', '', 'http://ogp.me/ns#locale'])
  const alternate = getArray(meta, ['rdfa', '', 'http://ogp.me/ns#locale:alternate'])

  if (primary || alternate) {
    return { primary, alternate }
  }
}

/**
 * Get twitter data.
 */
function getMetaTwitter (meta: HtmlResultMeta): HtmlSnippetTwitter {
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

/**
 * Extract/normalize the twitter handle.
 */
function getTwitterHandle (meta: HtmlResultMeta, path: Path) {
  const value = getString(meta, path)

  if (value) {
    // Normalize twitter handles.
    return value.replace(/^@/, '')
  }
}

/**
 * Get the TTL of the page.
 */
function getMetaTtl (meta: HtmlResultMeta): number {
  return getNumber(meta, ['rdfa', '', 'http://ogp.me/ns#ttl']) ||
    getNumber(meta, ['oembed', 'cache_age'])
}

/**
 * Get the object determiner.
 */
function getMetaDeterminer (meta: HtmlResultMeta): string {
  return getString(meta, ['rdfa', '', 'http://ogp.me/ns#determiner'])
}

/**
 * Retrieve a URL for embedding an interactive widget.
 */
function getMetaPlayer (meta: HtmlResultMeta, baseUrl: string): HtmlSnippetPlayer {
  const isPlayer = getString(meta, ['twitter', 'card']) === 'player'

  if (!isPlayer) {
    return
  }

  const url = getString(meta, ['twitter', 'player'])
  const width = getNumber(meta, ['twitter', 'player:width'])
  const height = getNumber(meta, ['twitter', 'player:height'])
  const streamUrl = getString(meta, ['twitter', 'player:stream'])
  const streamContentType = getString(meta, ['twitter', 'player:stream:content_type'])

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
function getMetaIcon (meta: HtmlResultMeta, options: Options): HtmlSnippetIcon {
  const preferredSize = Number(options.preferredIconSize) || 32
  let selectedSize: number
  let selectedIcon: HtmlSnippetIcon

  if (meta.html && meta.html.icons) {
    for (const icon of meta.html.icons) {
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
function getMetaMainEntity (meta: HtmlResultMeta, contentUrl: string): HtmlMainEntity {
  const twitterType = getString(meta, ['twitter', 'card'])
  const ogpType = getString(meta, ['rdfa', '', 'http://ogp.me/ns#type'])
  const oembedType = getString(meta, ['oembed', 'type'])

  if (ogpType === 'article') {
    return {
      type: 'article' as 'article',
      section: getString(meta, ['rdfa', '', 'http://ogp.me/ns/article#section']),
      publisher: getString(meta, ['rdfa', '', 'http://ogp.me/ns/article#publisher']),
      datePublished: getDate(meta, ['rdfa', '', 'http://ogp.me/ns/article#published_time']),
      dateExpires: getDate(meta, ['rdfa', '', 'http://ogp.me/ns/article#expiration_time']),
      dateModified: getDate(meta, ['rdfa', '', 'http://ogp.me/ns/article#modified_time'])
    }
  }

  if (oembedType === 'video') {
    return {
      type: 'video',
      html: getString(meta, ['oembed', 'html']),
      width: getNumber(meta, ['oembed', 'width']),
      height: getNumber(meta, ['oembed', 'height'])
    }
  }

  if (oembedType === 'rich') {
    return {
      type: 'rich',
      html: getString(meta, ['oembed', 'html']),
      width: getNumber(meta, ['oembed', 'width']),
      height: getNumber(meta, ['oembed', 'height'])
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
      url: getString(meta, ['oembed', 'url']),
      width: getNumber(meta, ['oembed', 'width']),
      height: getNumber(meta, ['oembed', 'height'])
    }
  }
}
