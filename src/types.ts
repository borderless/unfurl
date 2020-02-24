import { Readable } from "stream";

export interface Page {
  url: string;
  status: number;
  headers: Record<string, string | string[]>;
  body: Readable;
}

export type Scrape = (page: Page) => Promise<Snippet>;
export type ScrapeUrl = (url: string) => Promise<Snippet>;

export interface RequestOptions {
  accept?: string;
}

export type Request = (url: string, options?: RequestOptions) => Promise<Page>;

export interface Input {
  page: Page;
  request: Request;
  scrape: Scrape;
}

export type Next = (input: Input) => Promise<Snippet>;
export type Plugin = (input: Input, next: Next) => Promise<Snippet>;

export interface Snippet {
  type: "website" | "image" | "video" | "audio" | "document" | "link";
  url: string;
  secureUrl?: string;
  canonicalUrl?: string;
  encodingFormat?: string;
  headline?: string;
  description?: string;

  mainEntity?: Entity;
  tags?: string[];
  apps?: SnippetApp[];
  language?: string;

  image?: ImageEntity[];
  video?: VideoEntity[];
  audio?: AudioEntity[];
  icon?: ImageEntity[];

  author?: SnippetPerson;
  producer?: SnippetPerson;
  creator?: SnippetPerson;
  provider?: SnippetPerson;

  width?: number;
  height?: number;
  camera?: SnippetCamera;

  dateCreated?: Date;
  dateModified?: Date;
  datePublished?: Date;
}

export interface SnippetPerson {
  name?: string;
  url?: string;
  twitterHandle?: string;
}

export interface SnippetCamera {
  make?: string;
  model?: string;
  lensMake?: string;
  lensModel?: string;
  software?: string;
  orientation?: string;
  megapixels?: number;
}

export interface SnippetApp {
  device?: "iPhone" | "iPad" | "PC" | "Mobile";
  os: "iOS" | "Android" | "Windows";
  id: string;
  name: string;
  url: string;
}

export interface ArticleEntity {
  type: "article";
  section?: string;
  publisher?: string;
  dateModified?: Date;
  datePublished?: Date;
  dateExpires?: Date;
}

export interface ImageEntity {
  type: "image";
  url?: string;
  secureUrl?: string;
  encodingFormat?: string;
  description?: string;
  width?: number;
  height?: number;
}

export interface VideoEntity {
  type: "video";
  url?: string;
  secureUrl?: string;
  encodingFormat?: string;
  html?: string;
  width?: number;
  height?: number;
}

export interface AudioEntity {
  type: "audio";
  url?: string;
  secureUrl?: string;
  encodingFormat?: string;
}

export interface EmbedEntity {
  type: "embed";
  html?: string;
  width?: number;
  height?: number;
}

export type Entity =
  | ArticleEntity
  | VideoEntity
  | AudioEntity
  | ImageEntity
  | EmbedEntity;
