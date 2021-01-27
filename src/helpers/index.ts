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
export async function readBuffer(stream: Readable): Promise<Buffer> {
  const buf: Buffer[] = [];
  for await (const chunk of stream) buf.push(chunk);
  return Buffer.concat(buf);
}

/**
 * Parse stream into JSON payload.
 */
export async function readJson(stream: Readable): Promise<object> {
  const buffer = await readBuffer(stream);
  const data: unknown = JSON.parse(buffer.toString("utf8"));
  if (typeof data === "object" && data !== null) return data;
  return {};
}

/**
 * Extract `content-type` from headers.
 */
export function contentType(
  headers: Record<string, string | string[] | undefined>
): string {
  const header = headers["content-type"];
  if (Array.isArray(header)) {
    return (header[0] ?? "").split(";", 1)[0].trim().toLowerCase();
  }
  return (header ?? "").split(";", 1)[0].trim().toLowerCase();
}
