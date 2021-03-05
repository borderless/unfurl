import { Handler, Result, Alternative, RdfaNode } from "htmlmetaparser";
import { WritableStream } from "htmlparser2/lib/WritableStream";
import { Readable } from "stream";
import { expand } from "jsonld";
import type { Document, RemoteDocument } from "jsonld/jsonld-spec";
import { memoizeOne, partial } from "functools";
import { next, filter, map, list, flatten } from "iterative";
import { decodeHTML } from "entities";
import { contentType, readJson } from "../helpers";
import {
  Plugin,
  Request,
  App,
  MainEntity,
  Unfurl,
  Image,
  Video,
  Audio,
  Person,
  Embed,
} from "../types";

declare const URL: typeof import("url").URL;

const CONTENT_TYPE_JSON = "application/json";
const CONTENT_TYPE_OEMBED = "application/json+oembed";
const CONTENT_TYPE_JSON_LD = "application/ld+json";

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
  if (!metadata) return { type: "website", url };

  const graph = await normalizeJsonLd(
    [
      ...toArray(metadata.jsonld),
      ...toArray(metadata.rdfa),
      ...toArray(metadata.microdata),
    ],
    url,
    request
  );

  const oembed =
    status === 200 ? await getOembed(request, metadata.alternate) : undefined;
  const options: ExtractOptions = { url, metadata, graph, oembed };

  const snippet: Unfurl = {
    type: "website",
    url: url,
    encodingFormat: type,
    icon: getIcon(options),
    image: getImage(options),
    video: getVideo(options),
    audio: getAudio(options),
    mainEntity: getMainEntity(options),
    embed: getEmbed(options),
    canonicalUrl: getCanonicalUrl(options),
    headline: getHeadline(options),
    description: getDescription(options),
    provider: getProvider(options),
    author: getAuthor(options),
    tags: getTags(options),
    language: getLanguage(options),
    apps: getApps(options),
  };

  return snippet;
};

/**
 * Read OEmbed metadata from remote URL.
 */
async function getOembed(
  request: Request,
  alternate: Alternative[]
): Promise<Record<string, unknown> | undefined> {
  const oembed = alternate.filter(
    (x) => x.type === "application/json+oembed"
  )[0];
  if (!oembed) return;

  const page = await request(oembed.href, {
    accept: "application/json",
  });

  const type = contentType(page.headers);

  if (
    page.status === 200 &&
    (type === CONTENT_TYPE_JSON || type === CONTENT_TYPE_OEMBED)
  ) {
    try {
      const data = await readJson(page.body);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return data as Record<string, unknown>;
      }
    } catch (err) {
      /* Noop. */
    }
  }

  page.body.destroy();
}

/**
 * Options used for extracting metadata.
 */
interface ExtractOptions {
  url: string;
  metadata?: Result;
  graph?: JsonLd[];
  oembed?: { [key: string]: unknown };
}

interface JsonLd {
  "@id"?: string;
  "@language"?: string;
  "@value"?: string;
  "@graph"?: JsonLd[];
  "@type"?: string[];
  [key: string]: string | string[] | JsonLd[] | undefined;
}

/**
 * Create JSON-LD document loader with cache on `request`.
 */
const createJsonLdLoader = memoizeOne((request: Request) => {
  return async (url: string): Promise<RemoteDocument> => {
    const page = await request(url, {
      accept: "application/ld+json",
    });

    const type = contentType(page.headers);

    if (
      page.status === 200 &&
      (type === CONTENT_TYPE_JSON || type === CONTENT_TYPE_JSON_LD)
    ) {
      const data = await readJson(page.body);

      return {
        contextUrl: toValue(page.headers.link),
        documentUrl: page.url,
        document:
          typeof data === "object" && data !== null
            ? (data as Record<string, unknown>)
            : {},
      };
    }

    page.body.destroy();

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
): Promise<JsonLd[] | undefined> {
  if (!data) return;

  const documentLoader = createJsonLdLoader(request);
  const result = (await expand(data, { base: url, documentLoader }).catch(
    () => undefined
  )) as JsonLd[] | undefined;
  if (!result) return;

  const idPrefix = url.split("#", 1)[0];

  // Normalize out unneeded `@graph` data from JSON-LD.
  return Array.from(
    filter(
      flatten(
        map(result, (x) => {
          return x["@graph"] ?? toArray<JsonLd>(x);
        }) as Iterable<JsonLd[]>
      ),
      (x) => {
        const id = toString(x["@id"]);
        return !id || id === idPrefix || id.startsWith(`${idPrefix}#`);
      }
    )
  );
}

/**
 * Parse the HTML into metadata.
 */
function parse(stream: Readable, url: string) {
  return new Promise<Result | undefined>((resolve) => {
    const handler = new Handler(
      (err, result) => {
        return err ? resolve(undefined) : resolve(result);
      },
      {
        url,
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
 * Filters values for a string.
 */
function toString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Parse a string to a number.
 */
function parseNumber(value: string): number | undefined {
  const num = Number(value);
  return isFinite(num) ? num : undefined;
}

/**
 * Convert a string to valid number.
 */
function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseNumber(value);
}

/**
 * Convert a string to a valid date.
 */
function toDate(value: unknown): Date | undefined {
  if (typeof value !== "string") return;

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
  return value ? new URL(value, baseUrl).toString() : undefined;
}

/**
 * Set defined properties from one object to the other.
 */
function copyProps<T>(target: T, data: Partial<T>): T {
  for (const key of Object.keys(data) as (keyof T)[]) {
    const value = data[key];
    if (value !== undefined) target[key] = value as T[keyof T];
  }

  return target;
}

/**
 * Pick `@value` from a JSON-LD property.
 */
function jsonLdValue(jsonLd: JsonLd): string | undefined {
  if (!jsonLd["@value"]) return;
  return String(jsonLd["@value"]);
}

/**
 * Pick any key (shouldn't start with `@`) from JSON-LD.
 */
function jsonLdKey(key: string, jsonLd: JsonLd): JsonLd[] | undefined {
  return jsonLd[key] as JsonLd[] | undefined;
}

/**
 * Picks JSON-LD by `@type`.
 */
function jsonLdIsOfType(type: string, jsonLd: JsonLd): boolean {
  const jsonLdType = jsonLd["@type"] || [];
  return jsonLdType.includes(type);
}

/**
 * Pick JSON-LD `@id` property.
 */
function jsonLdIdString(value: JsonLd[] = []): string | undefined {
  return next(filter(map(value, (x) => x["@id"])), undefined);
}

/**
 * Pick JSON-LD `@value` property.
 */
function jsonLdValueString(value: JsonLd[] = []): string | undefined {
  return decode(next(filter(map(value, jsonLdValue)), undefined));
}

/**
 * Return a list of string values from JSON-LD.
 */
function jsonLdValueArray(value: JsonLd[] = []): string[] | undefined {
  return list(map(filter(map(value, jsonLdValue)), decode));
}

/**
 * Decode HTML string.
 */
function decode(value?: string) {
  return value ? decodeHTML(value) : undefined;
}

/**
 * Get the first non-nullable value from an iterable.
 */
function first<T>(value: Iterable<T>): T | undefined {
  return next(filter(value), undefined);
}

/**
 * Get first value in array.
 */
function firstOf<T, R>(
  value: T[] | undefined,
  mapFn: (value: T) => R | undefined
): R | undefined {
  if (!value) return;
  return first(map(value, mapFn));
}

/**
 * Get the canonical URL from the metadata.
 */
function getCanonicalUrl(options: ExtractOptions) {
  return (
    toUrl(options.metadata?.html?.canonical, options.url) ||
    toUrl(options.metadata?.twitter?.url, options.url) ||
    toUrl(
      jsonLdValueString(
        firstOf(options.graph, partial(jsonLdKey, "http://ogp.me/ns#url"))
      ),
      options.url
    ) ||
    toUrl(options.metadata?.applinks?.["web:url"], options.url) ||
    toUrl(toString(options.oembed?.url), options.url)
  );
}

/**
 * Get the metadata author.
 */
function getAuthor(options: ExtractOptions): Person {
  const name =
    options.metadata?.html?.author ||
    jsonLdValueString(
      firstOf(
        options.graph,
        (x) =>
          jsonLdKey("http://ogp.me/ns/article#author", x) ||
          jsonLdKey("https://creativecommons.org/ns#attributionName", x) ||
          firstOf(jsonLdKey("http://schema.org/author", x), (x) =>
            jsonLdKey("http://schema.org/name", x)
          )
      )
    ) ||
    decode(toString(options.oembed?.author_name)) ||
    options.metadata?.sailthru?.author;

  const url = toString(options.oembed?.author_url);
  const twitterHandle = toTwitterHandle(options.metadata?.twitter?.creator);

  return { name, url, twitterHandle };
}

/**
 * Get tags from metadata.
 */
function getTags(options: ExtractOptions): string[] {
  const htmlKeywords = options.metadata?.html?.keywords;
  if (htmlKeywords) return htmlKeywords.trim().split(/ *, */);

  const schemaKeywords = jsonLdValueArray(
    firstOf(options.graph, partial(jsonLdKey, "http://schema.org/keywords"))
  );
  if (schemaKeywords) {
    // Some websites return it comma separated in a single string.
    if (schemaKeywords.length === 1) return schemaKeywords[0].split(/ *, */);
    return schemaKeywords;
  }

  const videoTags = jsonLdValueArray(
    firstOf(options.graph, partial(jsonLdKey, "http://ogp.me/ns#video:tag"))
  );
  if (videoTags) return videoTags;

  return [];
}

/**
 * Get the name of the site.
 */
function getProvider(options: ExtractOptions): Person {
  const name =
    jsonLdValueString(
      firstOf(options.graph, partial(jsonLdKey, "http://ogp.me/ns#site_name"))
    ) ||
    decode(toString(options.oembed?.provider_name)) ||
    options.metadata?.html?.["application-name"] ||
    options.metadata?.html?.["apple-mobile-web-app-title"] ||
    options.metadata?.twitter?.["app:name:iphone"] ||
    options.metadata?.twitter?.["app:name:ipad"] ||
    options.metadata?.twitter?.["app:name:googleplay"] ||
    options.metadata?.applinks?.["ios:app_name"] ||
    options.metadata?.applinks?.["ipad:app_name"] ||
    options.metadata?.applinks?.["iphone:app_name"] ||
    options.metadata?.twitter?.["android:app_name"];

  const url = toString(options.oembed?.provider_url);
  const twitterHandle = toTwitterHandle(options.metadata?.twitter?.site);

  return { name, url, twitterHandle };
}

/**
 * Get the headline from the site.
 */
function getHeadline(options: ExtractOptions) {
  return (
    decode(toString(options.oembed?.title)) ||
    jsonLdValueString(
      firstOf(
        options.graph,
        (x) =>
          jsonLdKey("http://ogp.me/ns#title", x) ||
          jsonLdKey("http://purl.org/dc/terms/title", x)
      )
    ) ||
    options.metadata?.sailthru?.title ||
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
    jsonLdValueString(
      firstOf(
        options.graph,
        (x) =>
          jsonLdKey("http://schema.org/description", x) ||
          jsonLdKey("http://ogp.me/ns#description", x)
      )
    ) ||
    decode(toString(options.oembed?.summary)) ||
    options.metadata?.sailthru?.description ||
    options.metadata?.twitter?.description ||
    options.metadata?.html?.description
  );
}

/**
 * Extract an icons from page.
 */
function getIcon(options: ExtractOptions): Image[] {
  return toArray(options.metadata?.icons).map((x) => {
    const [width, height] =
      x.sizes
        ?.split(/\s+/)
        .map((x) => x.split("x", 2).map(Number))
        .sort((x) => x[0])
        .pop() || [];

    return {
      type: "image",
      url: x.href,
      encodingFormat: x.type,
      width,
      height,
    };
  });
}

/**
 * Get the meta image url.
 */
function getImage(options: ExtractOptions): Image[] {
  const ogpImages = jsonLdValueArray(
    firstOf(
      options.graph,
      (x) =>
        jsonLdKey("http://ogp.me/ns#image", x) ||
        jsonLdKey("http://ogp.me/ns#image:url", x)
    )
  );
  const twitterImages =
    toArray(options.metadata?.twitter?.image) ||
    toArray(options.metadata?.twitter?.image0);
  const sailthruImage = options.metadata?.sailthru?.["image.full"];
  const images: Image[] = [];

  function addImage(newImage: Image, append: boolean) {
    for (const image of images) {
      if (image.url === newImage.url) {
        copyProps(image, newImage);
        return;
      }
    }

    if (append && (newImage.url || newImage.secureUrl)) {
      images.push(newImage);
    }
  }

  function addImages(
    urls: string[],
    secureUrls: string[] = [],
    types: string[] = [],
    alts: string[] = [],
    widths: string[] = [],
    heights: string[] = [],
    append: boolean
  ) {
    for (let i = 0; i < urls.length; i++) {
      const secureUrl = toUrl(secureUrls[i], options.url);
      const url = toUrl(urls[i], options.url) ?? secureUrl;
      if (!url) continue;

      addImage(
        {
          type: "image",
          url: url,
          secureUrl: secureUrl,
          encodingFormat: types[i],
          description: alts[i],
          width: toNumber(widths[i]),
          height: toNumber(heights[i]),
        },
        append
      );
    }
  }

  if (sailthruImage) {
    const url = toUrl(sailthruImage, options.url);

    if (url) {
      addImage({ type: "image", url }, true);
    }
  }

  if (ogpImages) {
    const ogpTypes = jsonLdValueArray(
      firstOf(options.graph, partial(jsonLdKey, "http://ogp.me/ns#image:type"))
    );
    const ogpWidths = jsonLdValueArray(
      firstOf(options.graph, partial(jsonLdKey, "http://ogp.me/ns#image:width"))
    );
    const ogpHeights = jsonLdValueArray(
      firstOf(
        options.graph,
        partial(jsonLdKey, "http://ogp.me/ns#image:height")
      )
    );
    const ogpSecureUrls = jsonLdValueArray(
      firstOf(
        options.graph,
        partial(jsonLdKey, "http://ogp.me/ns#image:secure_url")
      )
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
function getAudio(options: ExtractOptions): Audio[] {
  const ogpAudios = jsonLdValueArray(
    firstOf(
      options.graph,
      (x) =>
        jsonLdKey("http://ogp.me/ns#audio", x) ||
        jsonLdKey("http://ogp.me/ns#audio:url", x)
    )
  );
  const audios: Audio[] = [];

  function addAudio(newAudio: Audio) {
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
    secureUrls: string[] = [],
    types: string[] = []
  ) {
    for (let i = 0; i < urls.length; i++) {
      const secureUrl = toUrl(secureUrls[i], options.url);
      const url = toUrl(urls[i], options.url) ?? secureUrl;
      if (!url) continue;

      const encodingFormat = types[i];
      addAudio({ type: "audio", url, secureUrl, encodingFormat });
    }
  }

  if (ogpAudios) {
    const ogpTypes = jsonLdValueArray(
      firstOf(options.graph, partial(jsonLdKey, "http://ogp.me/ns#audio:type"))
    );
    const ogpSecureUrls = jsonLdValueArray(
      firstOf(
        options.graph,
        partial(jsonLdKey, "http://ogp.me/ns#audio:secure_url")
      )
    );

    addAudios(ogpAudios, ogpSecureUrls, ogpTypes);
  }

  return audios;
}

/**
 * Get the meta image url.
 */
function getVideo(options: ExtractOptions): Video[] {
  const ogpVideos = jsonLdValueArray(
    firstOf(
      options.graph,
      (x) =>
        jsonLdKey("http://ogp.me/ns#video", x) ||
        jsonLdKey("http://ogp.me/ns#video:url", x)
    )
  );
  const videos: Video[] = [];

  function addVideo(newVideo: Video) {
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
    secureUrls: string[] = [],
    types: string[] = [],
    widths: string[] = [],
    heights: string[] = []
  ) {
    for (let i = 0; i < urls.length; i++) {
      const secureUrl = toUrl(secureUrls[i], options.url);
      const url = toUrl(urls[i], options.url) ?? secureUrl;
      if (!url) continue;

      const encodingFormat = types[i];
      const width = toNumber(widths[i]);
      const height = toNumber(heights[i]);

      addVideo({
        type: "video",
        url,
        secureUrl,
        encodingFormat,
        width,
        height,
      });
    }
  }

  if (ogpVideos) {
    const ogpTypes = jsonLdValueArray(
      firstOf(options.graph, partial(jsonLdKey, "http://ogp.me/ns#video:type"))
    );
    const ogpWidths = jsonLdValueArray(
      firstOf(options.graph, partial(jsonLdKey, "http://ogp.me/ns#video:width"))
    );
    const ogpHeights = jsonLdValueArray(
      firstOf(
        options.graph,
        partial(jsonLdKey, "http://ogp.me/ns#video:height")
      )
    );
    const ogpSecureUrls = jsonLdValueArray(
      firstOf(
        options.graph,
        partial(jsonLdKey, "http://ogp.me/ns#video:secure_url")
      )
    );

    addVideos(ogpVideos, ogpSecureUrls, ogpTypes, ogpWidths, ogpHeights);
  }

  if (options.metadata?.twitter?.card === "player") {
    const embedUrl = toUrl(options.metadata?.twitter?.["player"], options.url);
    const width = toNumber(options.metadata?.twitter?.["player:width"]);
    const height = toNumber(options.metadata?.twitter?.["player:height"]);
    const streamUrl = toUrl(
      options.metadata?.twitter?.["player:stream"],
      options.url
    );
    const streamEncodingFormat =
      options.metadata?.twitter?.["player:stream:content_type"];

    if (embedUrl && width && height) {
      addVideo({
        type: "video",
        url: embedUrl,
        encodingFormat: "text/html",
        width,
        height,
      });
    }

    if (streamUrl) {
      addVideo({
        type: "video",
        url: streamUrl,
        encodingFormat: streamEncodingFormat,
        width,
        height,
      });
    }
  }

  return videos;
}

/**
 * Get apps metadata.
 */
function getApps(options: ExtractOptions): App[] {
  return list(
    filter([
      getIphoneApp(options),
      getIpadApp(options),
      getIosApp(options),
      getAndroidApp(options),
      getWindowsApp(options),
      getWindowsPhoneApp(options),
      getWindowsUniversalApp(options),
    ])
  );
}

/**
 * Extract iPad app information from metadata.
 */
function getIpadApp(options: ExtractOptions): App | undefined {
  const twitterIpadUrl = options.metadata?.twitter?.["app:url:ipad"];
  const twitterIpadId = options.metadata?.twitter?.["app:id:ipad"];
  const twitterIpadName = options.metadata?.twitter?.["app:name:ipad"];

  if (twitterIpadId && twitterIpadName && twitterIpadUrl) {
    return {
      device: "iPad",
      os: "iOS",
      id: twitterIpadId,
      name: twitterIpadName,
      url: twitterIpadUrl,
    };
  }

  const applinksIpadUrl = options.metadata?.applinks?.["ipad:url"];
  const applinksIpadId = options.metadata?.applinks?.["ipad:app_store_id"];
  const applinksIpadName = options.metadata?.applinks?.["ipad:app_name"];

  if (applinksIpadId && applinksIpadName && applinksIpadUrl) {
    return {
      device: "iPad",
      os: "iOS",
      id: applinksIpadId,
      name: applinksIpadName,
      url: applinksIpadUrl,
    };
  }
}

/**
 * Extract iPhone app information from metadata.
 */
function getIphoneApp(options: ExtractOptions): App | undefined {
  const twitterIphoneUrl = options.metadata?.twitter?.["app:url:iphone"];
  const twitterIphoneId = options.metadata?.twitter?.["app:id:iphone"];
  const twitterIphoneName = options.metadata?.twitter?.["app:name:iphone"];

  if (twitterIphoneId && twitterIphoneName && twitterIphoneUrl) {
    return {
      device: "iPhone",
      os: "iOS",
      id: twitterIphoneId,
      name: twitterIphoneName,
      url: twitterIphoneUrl,
    };
  }

  const applinksIphoneUrl = options.metadata?.applinks?.["iphone:url"];
  const applinksIphoneId = options.metadata?.applinks?.["iphone:app_store_id"];
  const applinksIphoneName = options.metadata?.applinks?.["iphone:app_name"];

  if (applinksIphoneId && applinksIphoneName && applinksIphoneUrl) {
    return {
      device: "iPhone",
      os: "iOS",
      id: applinksIphoneId,
      name: applinksIphoneName,
      url: applinksIphoneUrl,
    };
  }
}

/**
 * Extract the iOS app metadata.
 */
function getIosApp(options: ExtractOptions): App | undefined {
  const applinksUrl = options.metadata?.applinks?.["ios:url"];
  const applinksId = options.metadata?.applinks?.["ios:app_store_id"];
  const applinksName = options.metadata?.applinks?.["ios:app_name"];

  if (applinksId && applinksName && applinksUrl) {
    return {
      os: "iOS",
      id: applinksId,
      name: applinksName,
      url: applinksUrl,
    };
  }
}

/**
 * Extract Android app metadata.
 */
function getAndroidApp(options: ExtractOptions): App | undefined {
  const twitterAndroidUrl = options.metadata?.twitter?.["app:url:googleplay"];
  const twitterAndroidId = options.metadata?.twitter?.["app:id:googleplay"];
  const twitterAndroidName = options.metadata?.twitter?.["app:name:googleplay"];

  if (twitterAndroidId && twitterAndroidName && twitterAndroidUrl) {
    return {
      os: "Android",
      id: twitterAndroidId,
      name: twitterAndroidName,
      url: twitterAndroidUrl,
    };
  }

  const applinksAndroidUrl = options.metadata?.applinks?.["android:url"];
  const applinksAndroidId = options.metadata?.applinks?.["android:package"];
  const applinksAndroidName = options.metadata?.applinks?.["android:app_name"];

  if (applinksAndroidId && applinksAndroidName && applinksAndroidUrl) {
    return {
      os: "Android",
      id: applinksAndroidId,
      name: applinksAndroidName,
      url: applinksAndroidUrl,
    };
  }
}

/**
 * Extract Windows Phone app metadata.
 */
function getWindowsPhoneApp(options: ExtractOptions): App | undefined {
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
      device: "Mobile",
      os: "Windows",
      id: applinksWindowsPhoneId,
      name: applinksWindowsPhoneName,
      url: applinksWindowsPhoneUrl,
    };
  }
}

/**
 * Extract Windows app metadata.
 */
function getWindowsApp(options: ExtractOptions): App | undefined {
  const applinksWindowsUrl = options.metadata?.applinks?.["windows:url"];
  const applinksWindowsId = options.metadata?.applinks?.["windows:app_id"];
  const applinksWindowsName = options.metadata?.applinks?.["windows:app_name"];

  if (applinksWindowsId && applinksWindowsName && applinksWindowsUrl) {
    return {
      device: "PC",
      os: "Windows",
      id: applinksWindowsId,
      name: applinksWindowsName,
      url: applinksWindowsUrl,
    };
  }
}

/**
 * Extract Windows Universal app metadata.
 */
function getWindowsUniversalApp(options: ExtractOptions): App | undefined {
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
      os: "Windows",
      id: applinksWindowsUniversalId,
      name: applinksWindowsUniversalName,
      url: applinksWindowsUniversalUrl,
    };
  }
}

/**
 * Get locale data.
 */
function getLanguage(options: ExtractOptions): string | undefined {
  return (
    jsonLdValueString(
      firstOf(options.graph, partial(jsonLdKey, "http://ogp.me/ns#locale"))
    ) || options.metadata?.html?.["language"]
  );
}

/**
 * Extract/normalize the twitter handle.
 */
function toTwitterHandle(value?: string) {
  // Normalize twitter handles.
  return value?.replace(/^@/, "");
}

/**
 * Convert a valid JSON-LD type to an image entity.
 */
function jsonLdToImage(
  options: ExtractOptions,
  jsonLd: JsonLd
): Image | undefined {
  const url = jsonLdIdString(jsonLdKey("http://schema.org/url", jsonLd));

  // Ted.com put URLs to the main page in their image schema.
  if (url && !url.startsWith(options.url)) {
    const height = toNumber(
      jsonLdValueString(jsonLdKey("http://schema.org/height", jsonLd))
    );
    const width = toNumber(
      jsonLdValueString(jsonLdKey("http://schema.org/width", jsonLd))
    );

    return { type: "image", url, height, width };
  }
}

/**
 * Convert a JSON-LD object to a `Person` type.
 */
function jsonLdToPerson(
  options: ExtractOptions,
  jsonLd: JsonLd
): Person | undefined {
  const name = jsonLdValueString(jsonLdKey("http://schema.org/name", jsonLd));

  if (name) {
    const image = first(
      map(
        jsonLdKey("http://schema.org/logo", jsonLd) || [],
        partial(jsonLdToImage, options)
      )
    );

    return { name, image };
  }
}

/**
 * Extract HTML page content types.
 */
function getMainEntity(options: ExtractOptions): MainEntity | undefined {
  const ogp = next(
    filter(options.graph || [], (x) => !!jsonLdKey("http://ogp.me/ns#type", x)),
    {}
  );

  const articleSchema = next(
    filter(options.graph || [], (x) =>
      jsonLdIsOfType("http://schema.org/NewsArticle", x)
    ),
    {} as JsonLd
  );

  const ogpType = jsonLdValueString(jsonLdKey("http://ogp.me/ns#type", ogp));

  if (articleSchema["@type"] || ogpType === "article") {
    return {
      type: "article",
      image: list(
        filter(
          map(
            jsonLdKey("http://schema.org/image", articleSchema) ?? [],
            partial(jsonLdToImage, options)
          )
        )
      ),
      author: next(
        filter(
          map(
            jsonLdKey("http://schema.org/author", articleSchema) ?? [],
            partial(jsonLdToPerson, options)
          )
        ),
        undefined
      ),
      publisher: next(
        filter(
          map(
            jsonLdKey("http://schema.org/publisher", articleSchema) ?? [],
            partial(jsonLdToPerson, options)
          )
        ),
        undefined
      ),
      headline: jsonLdValueString(
        jsonLdKey("http://schema.org/headline", articleSchema)
      ),
      section: jsonLdValueString(
        jsonLdKey("http://schema.org/articleSection", articleSchema) ??
          jsonLdKey("http://ogp.me/ns/article#section", ogp)
      ),
      datePublished: toDate(
        jsonLdValueString(
          jsonLdKey("http://schema.org/datePublished", articleSchema) ??
            jsonLdKey("http://ogp.me/ns/article#published_time", ogp)
        )
      ),
      dateExpires: toDate(
        jsonLdValueString(
          jsonLdKey("http://ogp.me/ns/article#expiration_time", ogp)
        )
      ),
      dateModified: toDate(
        jsonLdValueString(
          jsonLdKey("http://schema.org/dateModified", articleSchema) ??
            jsonLdKey("http://ogp.me/ns/article#modified_time", ogp)
        )
      ),
    };
  }
}

function getEmbed(options: ExtractOptions): Embed | undefined {
  const twitterType = options.metadata?.twitter?.card;
  const oembedType = options.oembed?.type;
  const html = toString(options.oembed?.html);

  if ((oembedType === "video" || oembedType === "rich") && html) {
    const html = toString(options.oembed?.html);

    if (html) {
      const width = toNumber(options.oembed?.width);
      const height = toNumber(options.oembed?.height);

      return { type: "rich", html, width, height };
    }
  }

  if (
    twitterType === "photo" ||
    twitterType === "gallery" ||
    oembedType === "photo"
  ) {
    const url = toUrl(toString(options.oembed?.url), options.url);

    if (url) {
      const width = toNumber(options.oembed?.width);
      const height = toNumber(options.oembed?.height);

      return { type: "image", url, width, height };
    }
  }
}
