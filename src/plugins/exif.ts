import { contentType, readBuffer } from "../helpers";
import type { Plugin, Unfurl } from "../types";
import type { Readable } from "stream";
import ExifReader from "exifreader";
import type { StringArrayTag } from "exifreader";

export const plugin: Plugin = async (input, next) => {
  const { url, headers, body } = input.page;
  const encodingFormat = contentType(headers);

  if (encodingFormat.startsWith("image/")) {
    return image(url, body, encodingFormat);
  }

  return next(input);
};

async function image(
  url: string,
  stream: Readable,
  encodingFormat: string
): Promise<Unfurl> {
  const data = await readBuffer(stream, 131072);
  try {
    const exifData = ExifReader.load(data, { expanded: true });

    return {
      type: "image",
      url,
      encodingFormat: exifData.xmp?.format?.value ?? encodingFormat,
      dateModified: date(exifData.xmp?.ModifyDate?.value),
      dateCreated:
        date(exifData.xmp?.DateCreated?.value) ??
        date(exifData.xmp?.CreateDate?.value),
      width: (exifData.file ?? exifData.pngFile)?.["Image Width"]?.value,
      height: (exifData.file ?? exifData.pngFile)?.["Image Height"]?.value,
      camera: {
        make: exifData.exif?.Make?.description,
        model: exifData.exif?.Model?.description,
        lensMake: (exifData.exif as Record<string, StringArrayTag>)?.LensMake
          ?.description,
        lensModel: (exifData.exif as Record<string, StringArrayTag>)?.LensModel
          ?.description,
        software: exifData.exif?.Software?.description,
        orientation: exifData.exif?.Orientation?.description,
      },
    };
  } catch {
    return { type: "image", url };
  }
}

function date(value: string | undefined): Date | undefined {
  if (!value) return;
  if (/(?:Z|[+-]\d\d\:\d\d)$/.test(value)) return new Date(value);
  return new Date(`${value}Z`);
}
