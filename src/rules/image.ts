import { Readable } from 'stream'
import { parse } from 'content-type'
import { Headers, AbortFn, Result } from '../interfaces'

export function supported (url: string, headers: Headers) {
  return headers['content-type'] ?
    /^image\//.test(parse(headers['content-type']).type) :
    false
}

export function handle (
  originalUrl: string,
  contentUrl: string,
  headers: Headers,
  stream: Readable,
  abort: AbortFn
): Result {
  // Immediately abort streaming image data.
  abort()

  return {
    type: 'image',
    originalUrl,
    contentUrl,
    contentSize: headers['content-length'] ? Number(headers['content-length']) : undefined,
    encodingFormat: parse(headers['content-type']).type,
    dateModified: headers['last-modified'] ? new Date(headers['last-modified'] as string) : undefined
  }
}
