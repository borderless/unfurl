import { Readable } from "stream";

export interface Page {
  url: string;
  status: number;
  headers: Record<string, string | string[]>;
  body: Readable;
}

export type Scrape = (page: Page) => Promise<Unfurl>;
export type ScrapeUrl = (url: string) => Promise<Unfurl>;

export interface RequestOptions {
  accept?: string;
}

export type Request = (url: string, options?: RequestOptions) => Promise<Page>;

export interface Input {
  page: Page;
  request: Request;
  scrape: Scrape;
}

export type Next = (input: Input) => Promise<Unfurl>;
export type Plugin = (input: Input, next: Next) => Promise<Unfurl>;

export interface Website {
  type: "website";
  url: string;
  canonicalUrl?: string;
  encodingFormat?: string;
  headline?: string;
  description?: string;

  mainEntity?: MainEntity;
  tags?: string[];
  apps?: App[];
  language?: string;

  image?: Image[];
  video?: Video[];
  audio?: Audio[];
  icon?: Image[];
  embed?: Embed;

  author?: Person;
  provider?: Person;
}

export interface Document {
  type: "document";
  url: string;
  encodingFormat?: string;
  headline?: string;

  author?: Person;
  producer?: Person;
  creator?: Person;

  dateCreated?: Date;
  dateModified?: Date;
}

export interface Image {
  type: "image";
  url: string;
  secureUrl?: string;
  encodingFormat?: string;
  description?: string;

  width?: number;
  height?: number;
  camera?: Camera;

  dateCreated?: Date;
  dateModified?: Date;
}

export interface Video {
  type: "video";
  url: string;
  secureUrl?: string;
  encodingFormat?: string;
  width?: number;
  height?: number;
}

export interface Audio {
  type: "audio";
  url: string;
  secureUrl?: string;
  encodingFormat?: string;
}

export interface Link {
  type: "link";
  url: string;
}

export type Unfurl = Website | Document | Image | Video | Audio | Link;

export interface Rich {
  type: "rich";
  html: string;
  width?: number;
  height?: number;
}

export type Embed = Image | Video | Rich;

export interface Person {
  name?: string;
  url?: string;
  twitterHandle?: string;
  image?: Image;
}

export interface Camera {
  make?: string;
  model?: string;
  lensMake?: string;
  lensModel?: string;
  software?: string;
  orientation?: string;
  megapixels?: number;
}

export interface App {
  device?: "iPhone" | "iPad" | "PC" | "Mobile";
  os: "iOS" | "Android" | "Windows";
  id: string;
  name: string;
  url: string;
}

export interface ArticleEntity {
  type: "article";
  headline?: string;
  image?: Image[];
  section?: string;
  publisher?: Person;
  author?: Person;
  dateModified?: Date;
  datePublished?: Date;
  dateExpires?: Date;
}

export type MainEntity = ArticleEntity;

export interface Options {
  request: Request;
  plugins: Plugin[];
}

/**
 * Wrap `scraper` by using `options.request` to make initial scrape request.
 */
export function urlScraper(options: Options): ScrapeUrl {
  const scrape = scraper(options);

  return async function scrapeUrl(url: string) {
    const page = await options.request(url);
    return scrape(page);
  };
}

/**
 * Scraper is composed of middleware returning a snippet.
 */
export function scraper(options: Options): Scrape {
  const { request, plugins } = options;

  const middleware = plugins.reduce<Next>(
    (next, plugin) => async (x: Input) => plugin(x, next),
    ({ page }: Input): Promise<Unfurl> => {
      page.body.resume(); // Discard unused data.

      return Promise.resolve({ type: "link", url: page.url });
    }
  );

  return async function scrape(page: Page) {
    const snippet: Unfurl = await middleware({ page, scrape, request });
    page.body.destroy(); // Destroy input stream.
    return snippet;
  };
}

/**
 * Extract MIME type from `content-type` headers.
 */
export function extractMime(contentType: string): string {
  return contentType.split(";", 1)[0].trim().toLowerCase();
}

/**
 * Extract `content-type` MIME type from headers.
 */
export function contentType(
  headers: Record<string, string | string[] | undefined>
): string {
  const header = headers["content-type"];
  return Array.isArray(header)
    ? extractMime(header[0] ?? "")
    : extractMime(header ?? "");
}

/**
 * Read stream into a buffer.
 */
export async function readBuffer(
  stream: Readable,
  maxBytes = Infinity
): Promise<Buffer> {
  let size = 0;
  const buf: Buffer[] = [];
  for await (const chunk of stream) {
    buf.push(chunk);
    size += chunk.length;
    if (size >= maxBytes) break;
  }
  return Buffer.concat(buf);
}
