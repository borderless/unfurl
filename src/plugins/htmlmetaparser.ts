import { Handler, Result, Alternative, ResultJsonLd } from "htmlmetaparser";
import { WritableStream } from "htmlparser2";
import { Readable } from "stream";
import { expand } from "jsonld";
import { Document } from "jsonld/jsonld-spec";
import { resolve } from "url";
import { memoizeOne } from "functools";
import { next, filter, map, list, flatten } from "iterative";
import { decodeHTML } from "entities";
import { contentType, readJson } from "../helpers";
import {
  Plugin,
  Request,
  ImageSnippet,
  AudioSnippet,
  VideoSnippet,
  SnippetApps,
  SnippetAppLink,
  SnippetLocale,
  SnippetTwitter,
  Entity,
  HtmlSnippet
} from "../types";

const OEMBED_CONTENT_TYPE = /^application\/json(?:\+oembed)?$/i;
const JSON_LD_CONTENT_TYPE = /^application\/(?:ld\+)?json$/i;

/**
 * Extract metadata from HTML documents.
 */
export const plugin: Plugin = async (input, next) => {
  const { request } = input;
  const { url, status, headers, body } = input.page;
  const type = contentType(headers);

  // Avoid parsing non-HTML documents.
  if (type !== "text/html") return next(input);

  const metadata = await parse(body, url);
  if (!metadata) return { type: "html", url };

  const graph = await normalizeJsonLd(
    [
      ...toArray(metadata.jsonld),
      ...toArray(metadata.rdfa),
      ...toArray(metadata.microdata)
    ],
    url,
    request
  );

  const oembed =
    status === 200 ? await getOembed(request, metadata.alternate) : undefined;
  const options = { url, metadata, graph, oembed };

  const snippet: HtmlSnippet = {
    type: "html",
    url: url,
    encodingFormat: type,
    image: getImage(options),
    video: getVideo(options),
    audio: getAudio(options),
    entity: getEntity(options),
    canonicalUrl: getCanonicalUrl(options),
    headline: getHeadline(options),
    description: getDescription(options),
    provider: getProvider(options),
    author: getAuthor(options),
    tags: getTags(options),
    locale: getLocale(options),
    twitter: getTwitter(options),
    apps: getApps(options)
  };

  return snippet;
};

/**
 * Read OEmbed metadata from remote URL.
 */
async function getOembed(
  request: Request,
  alternate: Alternative[]
): Promise<any> {
  const oembed = alternate.filter(x => x.type === "application/json+oembed")[0];
  if (!oembed) return;

  const page = await request(oembed.href, {
    accept: "application/json"
  });

  if (
    page.status === 200 &&
    OEMBED_CONTENT_TYPE.test(contentType(page.headers))
  ) {
    try {
      return await readJson(page.body);
    } catch (err) {
      /* Noop. */
    }
  }
}

/**
 * Options used for extracting metadata.
 */
interface ExtractOptions {
  url: string;
  metadata?: Result;
  graph?: ResultJsonLd[];
  oembed?: any;
}

/**
 * Create JSON-LD document loader with cache on `request`.
 */
const createJsonLdLoader = memoizeOne((request: Request) => {
  return async (url: string) => {
    const page = await request(url, {
      accept: "application/ld+json"
    });

    if (
      page.status === 200 &&
      JSON_LD_CONTENT_TYPE.test(contentType(page.headers))
    ) {
      return {
        contextUrl: toValue(page.headers.link),
        documentUrl: page.url,
        document: await readJson(page.body)
      };
    }

    return { documentUrl: page.url, document: {} };
  };
});

/**
 * Expand JSON-LD documents.
 */
async function normalizeJsonLd(
  data: Document | undefined,
  url: string,
  request: Request
) {
  if (!data) return;

  const documentLoader = createJsonLdLoader(request);
  const result = (await expand(data, { base: url, documentLoader }).catch(
    () => undefined
  )) as ResultJsonLd[] | undefined;

  if (!result) return;

  const idPrefix = url.split("#", 1)[0];

  // Normalize out unneeded `@graph` data from JSON-LD.
  return Array.from(
    filter(
      flatten(
        map(result, (x): ResultJsonLd[] => {
          return (x["@graph"] as ResultJsonLd[]) || toArray(x);
        }) as Iterable<ResultJsonLd[]>
      ),
      x => {
        const id: string = x["@id"] || "";
        return id === "" || id === idPrefix || id.startsWith(`${idPrefix}#`);
      }
    )
  );
}

/**
 * Parse the HTML into metadata.
 */
function parse(stream: Readable, url: string) {
  return new Promise<Result | undefined>(resolve => {
    const handler = new Handler(
      (err, result) => {
        return err ? resolve(undefined) : resolve(result);
      },
      {
        url
      }
    );

    stream.pipe(new WritableStream(handler, { decodeEntities: true }));
  });
}

/**
 * Convert a value to an array.
 */
function toArray<T>(value: T | T[] | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

/**
 * Convert a possible array into a single value.
 */
function toValue<T>(value: T | T[] | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Convert a string to valid number.
 */
function toNumber(value: string | undefined): number | undefined {
  if (!value) return;
  const num = Number(value);
  return isFinite(num) ? num : undefined;
}

/**
 * Convert a string to a valid date.
 */
function toDate(value: string | undefined): Date | undefined {
  if (!value) return;

  // Fix non-timezone specified ISO string to be UTC.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d*)?$/.test(value)) {
    return new Date(`${value}Z`);
  }

  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Extract a URL from an object.
 */
function toUrl(value: string | undefined, baseUrl: string): string | undefined {
  return value ? resolve(baseUrl, value) : undefined;
}

/**
 * Set defined properties from one object to the other.
 */
function copyProps(obj: any, data: any) {
  for (const key of Object.keys(data)) {
    if (data[key] != null) {
      obj[key] = data[key];
    }
  }

  return obj;
}

/**
 * Pick JSON-LD `@value` property.
 */
function jsonLdValue(value: any[] | undefined): string | undefined {
  if (!value) return;
  return decode(next(filter(map(value, x => x["@value"])), undefined));
}

/**
 * Return a list of string values from JSON-LD.
 */
function jsonLdArray(value: any[] | undefined): string[] | undefined {
  if (!value) return;
  return list(filter(map(value, x => x["@value"])));
}

/**
 * Decode HTML string.
 */
function decode(value?: string) {
  return value ? decodeHTML(value) : undefined;
}

/**
 * Get first value in array.
 */
function first<T, R>(
  value: T[] | undefined,
  mapFn: (value: T) => R
): R | undefined {
  if (value === undefined) return;
  return next(filter(map(value, mapFn)), undefined);
}

/**
 * Get the canonical URL from the metadata.
 */
function getCanonicalUrl(options: ExtractOptions) {
  return (
    toUrl(options.metadata?.html?.canonical, options.url) ||
    toUrl(options.metadata?.twitter?.url, options.url) ||
    toUrl(
      jsonLdValue(first(options.graph, x => x["http://ogp.me/ns#url"])),
      options.url
    ) ||
    toUrl(options.metadata?.applinks?.["web:url"], options.url) ||
    toUrl(options.oembed?.url, options.url)
  );
}

/**
 * Get the metadata author.
 */
function getAuthor(options: ExtractOptions) {
  const name =
    options.metadata?.html?.author ||
    jsonLdValue(
      first(
        options.graph,
        x =>
          x["http://ogp.me/ns/article#author"] ||
          x["https://creativecommons.org/ns#attributionName"] ||
          first(
            x["http://schema.org/author"],
            (x: any) => x["http://schema.org/name"]
          )
      )
    ) ||
    decode(options.oembed?.author_name) ||
    options.metadata?.sailthru?.author;

  const url = options.oembed?.author_url;

  return { name, url };
}

/**
 * Get tags from metadata.
 */
function getTags(options: ExtractOptions): string[] {
  const htmlKeywords = options.metadata?.html?.keywords?.trim();
  if (htmlKeywords) return htmlKeywords.split(/ *, */);

  const metaTags = jsonLdArray(
    first(options.graph, x => x["http://ogp.me/ns#video:tag"])
  );

  return metaTags || [];
}

/**
 * Get the name of the site.
 */
function getProvider(options: ExtractOptions) {
  const name =
    jsonLdValue(first(options.graph, x => x["http://ogp.me/ns#site_name"])) ||
    decode(options.oembed?.provider_name) ||
    options.metadata?.html?.["application-name"] ||
    options.metadata?.html?.["apple-mobile-web-app-title"] ||
    options.metadata?.twitter?.["app:name:iphone"] ||
    options.metadata?.twitter?.["app:name:ipad"] ||
    options.metadata?.twitter?.["app:name:googleplay"] ||
    options.metadata?.applinks?.["ios:app_name"] ||
    options.metadata?.applinks?.["ipad:app_name"] ||
    options.metadata?.applinks?.["iphone:app_name"] ||
    options.metadata?.twitter?.["android:app_name"];

  const url = options.oembed?.provider_url;

  return { name, url };
}

/**
 * Get the headline from the site.
 */
function getHeadline(options: ExtractOptions) {
  return (
    decode(options.oembed?.title) ||
    jsonLdValue(
      first(
        options.graph,
        x => x["http://ogp.me/ns#title"] || x["http://purl.org/dc/terms/title"]
      )
    ) ||
    options.metadata?.twitter?.title ||
    options.metadata?.twitter?.["text:title"] ||
    options.metadata?.html?.title
  );
}

/**
 * Get the caption from the site.
 */
function getDescription(options: ExtractOptions) {
  return (
    jsonLdValue(
      first(
        options.graph,
        x =>
          x["http://ogp.me/ns#description"] ||
          x["http://schema.org/description"]
      )
    ) ||
    decode(options.oembed?.summary) ||
    options.metadata?.twitter?.["description"] ||
    options.metadata?.html?.["description"]
  );
}

/**
 * Get the meta image url.
 */
function getImage(options: ExtractOptions): ImageSnippet[] {
  const ogpImages = jsonLdArray(
    first(
      options.graph,
      x => x["http://ogp.me/ns#image"] || x["http://ogp.me/ns#image:url"]
    )
  );
  const twitterImages =
    toArray(options.metadata?.twitter?.image) ||
    toArray(options.metadata?.twitter?.image0);
  const images: ImageSnippet[] = [];

  function addImage(newImage: ImageSnippet, append: boolean) {
    for (const image of images) {
      if (image.url === newImage.url) {
        copyProps(image, newImage);
        return;
      }
    }

    if (append) {
      images.push(newImage);
    }
  }

  function addImages(
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
          type: "image",
          url: urls[i],
          secureUrl: secureUrls ? secureUrls[i] : undefined,
          encodingFormat: types ? types[i] : undefined,
          description: alts ? alts[i] : undefined,
          width: widths ? toNumber(widths[i]) : undefined,
          height: heights ? toNumber(heights[i]) : undefined
        },
        append
      );
    }
  }

  if (ogpImages) {
    const ogpTypes = jsonLdArray(
      first(options.graph, x => x["http://ogp.me/ns#image:type"])
    );
    const ogpWidths = jsonLdArray(
      first(options.graph, x => x["http://ogp.me/ns#image:width"])
    );
    const ogpHeights = jsonLdArray(
      first(options.graph, x => x["http://ogp.me/ns#image:height"])
    );
    const ogpSecureUrls = jsonLdArray(
      first(options.graph, x => x["http://ogp.me/ns#image:secure_url"])
    );

    addImages(
      ogpImages,
      ogpSecureUrls,
      ogpTypes,
      undefined,
      ogpWidths,
      ogpHeights,
      true
    );
  }

  if (twitterImages) {
    const twitterAlts = toArray(options.metadata?.twitter?.["image:alt"]);
    const twitterWidths = toArray(options.metadata?.twitter?.["image:width"]);
    const twitterHeights = toArray(options.metadata?.twitter?.["image:height"]);

    addImages(
      twitterImages,
      undefined,
      undefined,
      twitterAlts,
      twitterWidths,
      twitterHeights,
      !ogpImages
    );
  }

  return images;
}

/**
 * Get the meta audio information.
 */
function getAudio(options: ExtractOptions): AudioSnippet[] {
  const ogpAudios = jsonLdArray(
    first(
      options.graph,
      x => x["http://ogp.me/ns#audio"] || x["http://ogp.me/ns#audio:url"]
    )
  );
  const audios: AudioSnippet[] = [];

  function addAudio(newAudio: AudioSnippet) {
    for (const audio of audios) {
      if (audio.url === newAudio.url) {
        copyProps(audio, newAudio);
        return;
      }
    }

    audios.push(newAudio);
  }

  function addAudios(
    urls: string[],
    secureUrls: string[] | undefined,
    types: string[] | undefined
  ) {
    for (let i = 0; i < urls.length; i++) {
      addAudio({
        type: "audio",
        url: urls[i],
        secureUrl: secureUrls ? secureUrls[i] : undefined,
        encodingFormat: types ? types[i] : undefined
      });
    }
  }

  if (ogpAudios) {
    const ogpTypes = jsonLdArray(
      first(options.graph, x => x["http://ogp.me/ns#audio:type"])
    );
    const ogpSecureUrls = jsonLdArray(
      first(options.graph, x => x["http://ogp.me/ns#audio:secure_url"])
    );

    addAudios(ogpAudios, ogpSecureUrls, ogpTypes);
  }

  return audios;
}

/**
 * Get the meta image url.
 */
function getVideo(options: ExtractOptions): VideoSnippet[] {
  const ogpVideos = jsonLdArray(
    first(
      options.graph,
      x => x["http://ogp.me/ns#video"] || x["http://ogp.me/ns#video:url"]
    )
  );
  const videos: VideoSnippet[] = [];

  function addVideo(newVideo: VideoSnippet) {
    for (const video of videos) {
      if (video.url === newVideo.url) {
        copyProps(video, newVideo);
        return;
      }
    }

    videos.push(newVideo);
  }

  function addVideos(
    urls: string[],
    secureUrls: string[] | undefined,
    types: string[] | undefined,
    widths: string[] | undefined,
    heights: string[] | undefined
  ) {
    for (let i = 0; i < urls.length; i++) {
      addVideo({
        type: "video",
        url: urls[i],
        secureUrl: secureUrls ? secureUrls[i] : undefined,
        encodingFormat: types ? types[i] : undefined,
        width: widths ? toNumber(widths[i]) : undefined,
        height: heights ? toNumber(heights[i]) : undefined
      });
    }
  }

  if (ogpVideos) {
    const ogpTypes = jsonLdArray(
      first(options.graph, x => x["http://ogp.me/ns#video:type"])
    );
    const ogpWidths = jsonLdArray(
      first(options.graph, x => x["http://ogp.me/ns#video:width"])
    );
    const ogpHeights = jsonLdArray(
      first(options.graph, x => x["http://ogp.me/ns#video:height"])
    );
    const ogpSecureUrls = jsonLdArray(
      first(options.graph, x => x["http://ogp.me/ns#video:secure_url"])
    );

    addVideos(ogpVideos, ogpSecureUrls, ogpTypes, ogpWidths, ogpHeights);
  }

  if (options.metadata?.twitter?.card === "player") {
    const embedUrl = options.metadata?.twitter?.["player"];
    const width = toNumber(options.metadata?.twitter?.["player:width"]);
    const height = toNumber(options.metadata?.twitter?.["player:height"]);
    const url = options.metadata?.twitter?.["player:stream"];
    const encodingFormat =
      options.metadata?.twitter?.["player:stream:content_type"];

    if (embedUrl && width && height) {
      addVideo({
        type: "video",
        url: embedUrl,
        encodingFormat: "text/html",
        width,
        height
      });
    }

    if (url) {
      addVideo({ type: "video", url, encodingFormat, width, height });
    }
  }

  return videos;
}

/**
 * Get apps metadata.
 */
function getApps(options: ExtractOptions): SnippetApps {
  return {
    iphone: getIphoneApp(options),
    ipad: getIpadApp(options),
    android: getAndroidApp(options),
    windows: getWindowsApp(options),
    windowsPhone: getWindowsPhoneApp(options)
  };
}

/**
 * Extract iPad app information from metadata.
 */
function getIpadApp(options: ExtractOptions): SnippetAppLink | undefined {
  const twitterIpadUrl = options.metadata?.twitter?.["app:url:ipad"];
  const twitterIpadId = options.metadata?.twitter?.["app:id:ipad"];
  const twitterIpadName = options.metadata?.twitter?.["app:name:ipad"];

  if (twitterIpadId && twitterIpadName && twitterIpadUrl) {
    return {
      id: twitterIpadId,
      name: twitterIpadName,
      url: twitterIpadUrl
    };
  }

  const applinksIpadUrl = options.metadata?.applinks?.["ipad:url"];
  const applinksIpadId = options.metadata?.applinks?.["ipad:app_store_id"];
  const applinksIpadName = options.metadata?.applinks?.["ipad:app_name"];

  if (applinksIpadId && applinksIpadName && applinksIpadUrl) {
    return {
      id: applinksIpadId,
      name: applinksIpadName,
      url: applinksIpadUrl
    };
  }

  return getIosApp(options);
}

/**
 * Extract iPhone app information from metadata.
 */
function getIphoneApp(options: ExtractOptions): SnippetAppLink | undefined {
  const twitterIphoneUrl = options.metadata?.twitter?.["app:url:iphone"];
  const twitterIphoneId = options.metadata?.twitter?.["app:id:iphone"];
  const twitterIphoneName = options.metadata?.twitter?.["app:name:iphone"];

  if (twitterIphoneId && twitterIphoneName && twitterIphoneUrl) {
    return {
      id: twitterIphoneId,
      name: twitterIphoneName,
      url: twitterIphoneUrl
    };
  }

  const applinksIphoneUrl = options.metadata?.applinks?.["iphone:url"];
  const applinksIphoneId = options.metadata?.applinks?.["iphone:app_store_id"];
  const applinksIphoneName = options.metadata?.applinks?.["iphone:app_name"];

  if (applinksIphoneId && applinksIphoneName && applinksIphoneUrl) {
    return {
      id: applinksIphoneId,
      name: applinksIphoneName,
      url: applinksIphoneUrl
    };
  }

  return getIosApp(options);
}

/**
 * Extract the iOS app metadata.
 */
function getIosApp(options: ExtractOptions): SnippetAppLink | undefined {
  const applinksUrl = options.metadata?.applinks?.["ios:url"];
  const applinksId = options.metadata?.applinks?.["ios:app_store_id"];
  const applinksName = options.metadata?.applinks?.["ios:app_name"];

  if (applinksId && applinksName && applinksUrl) {
    return {
      id: applinksId,
      name: applinksName,
      url: applinksUrl
    };
  }
}

/**
 * Extract Android app metadata.
 */
function getAndroidApp(options: ExtractOptions): SnippetAppLink | undefined {
  const twitterAndroidUrl = options.metadata?.twitter?.["app:url:googleplay"];
  const twitterAndroidId = options.metadata?.twitter?.["app:id:googleplay"];
  const twitterAndroidName = options.metadata?.twitter?.["app:name:googleplay"];

  if (twitterAndroidId && twitterAndroidName && twitterAndroidUrl) {
    return {
      id: twitterAndroidId,
      name: twitterAndroidName,
      url: twitterAndroidUrl
    };
  }

  const applinksAndroidUrl = options.metadata?.applinks?.["android:url"];
  const applinksAndroidId = options.metadata?.applinks?.["android:package"];
  const applinksAndroidName = options.metadata?.applinks?.["android:app_name"];

  if (applinksAndroidId && applinksAndroidName && applinksAndroidUrl) {
    return {
      id: applinksAndroidId,
      name: applinksAndroidName,
      url: applinksAndroidUrl
    };
  }
}

/**
 * Extract Windows Phone app metadata.
 */
function getWindowsPhoneApp(
  options: ExtractOptions
): SnippetAppLink | undefined {
  const applinksWindowsPhoneUrl =
    options.metadata?.applinks?.["windows_phone:url"];
  const applinksWindowsPhoneId =
    options.metadata?.applinks?.["windows_phone:app_id"];
  const applinksWindowsPhoneName =
    options.metadata?.applinks?.["windows_phone:app_name"];

  if (
    applinksWindowsPhoneId &&
    applinksWindowsPhoneName &&
    applinksWindowsPhoneUrl
  ) {
    return {
      id: applinksWindowsPhoneId,
      name: applinksWindowsPhoneName,
      url: applinksWindowsPhoneUrl
    };
  }

  return getWindowsUniversalApp(options);
}

/**
 * Extract Windows app metadata.
 */
function getWindowsApp(options: ExtractOptions): SnippetAppLink | undefined {
  const applinksWindowsUrl = options.metadata?.applinks?.["windows:url"];
  const applinksWindowsId = options.metadata?.applinks?.["windows:app_id"];
  const applinksWindowsName = options.metadata?.applinks?.["windows:app_name"];

  if (applinksWindowsId && applinksWindowsName && applinksWindowsUrl) {
    return {
      id: applinksWindowsId,
      name: applinksWindowsName,
      url: applinksWindowsUrl
    };
  }

  return getWindowsUniversalApp(options);
}

/**
 * Extract Windows Universal app metadata.
 */
function getWindowsUniversalApp(
  options: ExtractOptions
): SnippetAppLink | undefined {
  const applinksWindowsUniversalUrl =
    options.metadata?.applinks?.["windows_universal:url"];
  const applinksWindowsUniversalId =
    options.metadata?.applinks?.["windows_universal:app_id"];
  const applinksWindowsUniversalName =
    options.metadata?.applinks?.["windows_universal:app_name"];

  if (
    applinksWindowsUniversalId &&
    applinksWindowsUniversalName &&
    applinksWindowsUniversalUrl
  ) {
    return {
      id: applinksWindowsUniversalId,
      name: applinksWindowsUniversalName,
      url: applinksWindowsUniversalUrl
    };
  }
}

/**
 * Get locale data.
 */
function getLocale(options: ExtractOptions): SnippetLocale | undefined {
  const primary =
    jsonLdValue(first(options.graph, x => x["http://ogp.me/ns#locale"])) ||
    options.metadata?.html?.["language"];
  const alternate = jsonLdArray(
    first(options.graph, x => x["http://ogp.me/ns#locale:alternate"])
  );

  if (primary || alternate) {
    return { primary, alternate };
  }
}

/**
 * Get twitter data.
 */
function getTwitter(options: ExtractOptions): SnippetTwitter | undefined {
  const creatorId = options.metadata?.twitter?.["creator:id"];
  const creatorHandle = toTwitterHandle(options.metadata?.twitter?.creator);
  const siteId = options.metadata?.twitter?.["site:id"];
  const siteHandle = toTwitterHandle(options.metadata?.twitter?.site);

  if (siteId || siteHandle || creatorId || creatorHandle) {
    return {
      siteId,
      siteHandle,
      creatorId,
      creatorHandle
    };
  }
}

/**
 * Extract/normalize the twitter handle.
 */
function toTwitterHandle(value?: string) {
  // Normalize twitter handles.
  return value?.replace(/^@/, "");
}

/**
 * Extract HTML page content types.
 */
function getEntity(options: ExtractOptions): Entity | undefined {
  const twitterType = options.metadata?.twitter?.card;
  const ogpType = jsonLdValue(
    first(options.graph, x => x["http://ogp.me/ns#type"])
  );
  const oembedType = options.oembed?.type;

  if (ogpType === "article") {
    return {
      type: "article",
      section: jsonLdValue(
        first(options.graph, x => x["http://ogp.me/ns/article#section"])
      ),
      publisher: jsonLdValue(
        first(options.graph, x => x["http://ogp.me/ns/article#publisher"])
      ),
      datePublished: toDate(
        jsonLdValue(
          first(
            options.graph,
            x =>
              x["http://ogp.me/ns/article#published_time"] ||
              x["http://schema.org/datePublished"]
          )
        )
      ),
      dateExpires: toDate(
        jsonLdValue(
          first(
            options.graph,
            x => x["http://ogp.me/ns/article#expiration_time"]
          )
        )
      ),
      dateModified: toDate(
        jsonLdValue(
          first(options.graph, x => x["http://ogp.me/ns/article#modified_time"])
        )
      )
    };
  }

  if (oembedType === "video") {
    return {
      type: "video",
      html: options.oembed?.html,
      width: toNumber(options.oembed?.width),
      height: toNumber(options.oembed?.height)
    };
  }

  if (oembedType === "rich") {
    return {
      type: "rich",
      html: options.oembed?.html,
      width: toNumber(options.oembed?.width),
      height: toNumber(options.oembed?.height)
    };
  }

  if (
    twitterType === "summary_large_image" ||
    twitterType === "photo" ||
    twitterType === "gallery" ||
    oembedType === "photo"
  ) {
    return {
      type: "image",
      url: options.oembed?.url,
      width: toNumber(options.oembed?.width),
      height: toNumber(options.oembed?.height)
    };
  }

  return;
}
