import { exec } from "exiftool2";
import {
  Plugin,
  Snippet,
  PdfSnippet,
  ImageSnippet,
  VideoSnippet
} from "../types";
import { tee, contentType } from "../helpers";
import { Readable } from "stream";
import { parse } from "exif-date";

export const plugin: Plugin = async (input, next) => {
  const { scrape, request } = input;
  const { url, status, headers, body } = input.page;

  const [a, b] = tee(body);
  const [snippet, result] = await Promise.all<Snippet | undefined, Snippet>([
    extract(url, headers, a),
    next({ page: { url, status, headers, body: b }, scrape, request })
  ]);

  return snippet ? Object.assign(result, snippet) : result;
};

function extract(
  url: string,
  headers: Record<string, string | string[]>,
  stream: Readable
) {
  const type = contentType(headers);

  if (type === "application/pdf") {
    return pdf(url, stream);
  }

  if (type.startsWith("image/")) {
    return image(url, stream);
  }

  if (type.startsWith("video/")) {
    return video(url, stream);
  }

  stream.resume(); // Discard.

  return undefined;
}

async function pdf(url: string, stream: Readable): Promise<PdfSnippet> {
  const exifData = await extractExifData(stream);
  if (!exifData) return { url, type: "pdf" };

  return {
    url,
    type: "pdf",
    pageCount: exifData.PageCount,
    producer: exifData.Producer,
    author: exifData.Author,
    creator: exifData.Creator,
    headline: exifData.Title,
    dateCreated: parseExifDate(exifData.CreateDate),
    dateModified: parseExifDate(exifData.ModifyDate)
  };
}

async function image(url: string, stream: Readable): Promise<ImageSnippet> {
  const exifData = await extractExifData(stream);
  if (!exifData) return { url, type: "image" };

  return {
    url,
    type: "image",
    dateModified: parseExifDate(exifData.ModifyDate),
    dateCreated:
      parseExifDate(exifData.SubSecDateTimeOriginal) ||
      parseExifDate(exifData.DateTimeCreated) ||
      parseExifDate(exifData.DigitalCreationDateTime),
    width: exifData.ImageWidth,
    height: exifData.ImageHeight,
    make: exifData.Make,
    model: exifData.Model,
    lensMake: exifData.LensMake,
    lensModel: exifData.LensModel,
    software: exifData.Software,
    megapixels: exifData.Megapixels,
    orientation: exifData.Orientation
  };
}

function video(url: string, stream: Readable): VideoSnippet {
  return { url, type: "video" };
}

/**
 * Extract exif data from a document.
 */
async function extractExifData(stream: Readable) {
  return new Promise<Record<string, any> | undefined>(resolve => {
    const exif = exec("-fast", "-");
    exif.on("exif", exif => resolve(exif[0]));
    exif.on("error", () => resolve(undefined));
    stream.pipe(exif);
  });
}

/**
 * Parse an EXIF date.
 */
function parseExifDate(value: string | undefined): Date | undefined {
  return value ? parse(value) : undefined;
}
