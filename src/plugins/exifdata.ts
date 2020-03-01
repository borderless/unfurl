import { exec } from "exiftool2";
import { Plugin, Snippet } from "../types";
import { contentType } from "../helpers";
import { Readable } from "stream";
import { parse } from "exif-date";

export const plugin: Plugin = async (input, next) => {
  const { url, headers, body } = input.page;
  const type = contentType(headers);

  if (type === "application/pdf") {
    return pdf(url, body);
  }

  if (type.startsWith("image/")) {
    return image(url, body);
  }

  if (type.startsWith("video/")) {
    return video(url, body);
  }

  return next(input);
};

async function pdf(url: string, stream: Readable): Promise<Snippet> {
  const exifData = await extractExifData(stream);
  if (!exifData) return { type: "document", url };

  return {
    url,
    type: "document",
    encodingFormat: exifData.MIMEType,
    producer: exifData.Producer && { name: exifData.Producer },
    author: exifData.Author && { name: exifData.Author },
    creator: exifData.Creator && { name: exifData.Creator },
    headline: exifData.Title,
    dateCreated: parseExifDate(exifData.CreateDate),
    dateModified: parseExifDate(exifData.ModifyDate)
  };
}

async function image(url: string, stream: Readable): Promise<Snippet> {
  const exifData = await extractExifData(stream);
  if (!exifData) return { type: "image", url };

  return {
    type: "image",
    url,
    encodingFormat: exifData.MIMEType,
    dateModified: parseExifDate(exifData.ModifyDate),
    dateCreated:
      parseExifDate(exifData.SubSecDateTimeOriginal) ||
      parseExifDate(exifData.DateTimeCreated) ||
      parseExifDate(exifData.DigitalCreationDateTime),
    width: exifData.ImageWidth,
    height: exifData.ImageHeight,
    camera: {
      make: exifData.Make,
      model: exifData.Model,
      lensMake: exifData.LensMake,
      lensModel: exifData.LensModel,
      software: exifData.Software,
      megapixels: exifData.Megapixels,
      orientation: exifData.Orientation
    }
  };
}

async function video(url: string, stream: Readable): Promise<Snippet> {
  const exifData = await extractExifData(stream);
  if (!exifData) return { type: "video", url };

  return { type: "video", url, encodingFormat: exifData.MIMEType };
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
