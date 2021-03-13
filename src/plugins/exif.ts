import { contentType, readBuffer } from "../helpers";
import type { Plugin, Unfurl } from "../types";
import type { Readable } from "stream";

const { parse } = require("exifr/dist/lite.umd.cjs");

export const plugin: Plugin = async (input, next) => {
  const { url, headers, body } = input.page;
  const encodingFormat = contentType(headers);

  if (encodingFormat.startsWith("image/")) {
    return image(url, body, encodingFormat);
  }

  return next(input);
};

const EXIFR_PARSE_OPTIONS = {
  xmp: false,
  tiff: true,
  exif: true,
  ifd0: false,
};

async function image(
  url: string,
  stream: Readable,
  encodingFormat: string
): Promise<Unfurl> {
  const data = await readBuffer(stream, 65536);
  try {
    const exifData = await parse(data.buffer, EXIFR_PARSE_OPTIONS);
    if (!exifData) return { type: "image", url };

    return {
      type: "image",
      url,
      encodingFormat,
      dateModified: exifData.ModifyDate,
      dateCreated: exifData.DateTimeOriginal || exifData.CreateDate,
      width: exifData.ImageWidth,
      height: exifData.ImageHeight,
      camera: {
        make: exifData.Make,
        model: exifData.Model,
        lensMake: exifData.LensMake,
        lensModel: exifData.LensModel,
        software: exifData.Software,
        orientation: exifData.Orientation,
      },
    };
  } catch {
    return { type: "image", url };
  }
}
