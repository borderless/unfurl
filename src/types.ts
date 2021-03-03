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
  section?: string;
  dateModified?: Date;
  datePublished?: Date;
  dateExpires?: Date;
}

export type MainEntity = ArticleEntity;
