import { Readable, PassThrough } from "stream";

/**
 * Fork readable stream into multiple parts.
 */
export function tee(stream: Readable) {
  return [stream.pipe(new PassThrough()), stream.pipe(new PassThrough())];
}

/**
 * Read stream into a buffer.
 */
export async function readBuffer(stream: Readable) {
  const buf: Buffer[] = [];
  for await (const chunk of stream) buf.push(chunk);
  return Buffer.concat(buf);
}

/**
 * Parse stream into JSON payload.
 */
export async function readJson(stream: Readable) {
  const buffer = await readBuffer(stream);
  return JSON.parse(buffer.toString("utf8"));
}

/**
 * Extract `content-type` from headers.
 */
export function contentType(
  headers: Record<string, string | string[] | undefined>
) {
  const header = headers["content-type"];
  if (Array.isArray(header)) {
    return header[0]
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
  }
  return header
    ? header
        .split(";", 1)[0]
        .trim()
        .toLowerCase()
    : "";
}
