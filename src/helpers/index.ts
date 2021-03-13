import { Readable, PassThrough } from "stream";

/**
 * Fork readable stream into multiple parts.
 */
export function tee(stream: Readable): [Readable, Readable] {
  return [stream.pipe(new PassThrough()), stream.pipe(new PassThrough())];
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

/**
 * Parse stream into JSON payload.
 */
export async function readJson(stream: Readable): Promise<unknown> {
  const buffer = await readBuffer(stream);
  const data: unknown = JSON.parse(buffer.toString("utf8"));
  return data;
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
