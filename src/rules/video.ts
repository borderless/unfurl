import { Readable } from 'stream'
import { parse } from 'content-type'
import { Headers, AbortFn, Result } from '../interfaces'

export function supported (url: string, headers: Headers) {
  return headers['content-type'] ?
    /^video\//.test(parse(headers['content-type']).type) :
    false
}

export function handle (url: string, headers: Headers, stream: Readable, abort: AbortFn): Result {
  // Immediately abort streaming video data.
  abort()

  return {
    type: 'video',
    contentUrl: url,
    contentSize: headers['content-length'] ? Number(headers['content-length']) : undefined,
    encodingFormat: String(headers['content-type']).substr(6),
    uploadDate: headers['last-modified'] ? new Date(headers['last-modified'] as string) : undefined
  }
}
