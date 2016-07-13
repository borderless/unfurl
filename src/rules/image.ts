import { Readable } from 'stream'
import extend = require('xtend')
import { Headers, AbortFn, Result, BaseInfo } from '../interfaces'

export function supported ({ encodingFormat }: BaseInfo) {
  return /^image\//.test(encodingFormat)
}

export function handle (base: BaseInfo, headers: Headers, stream: Readable, abort: AbortFn): Result {
  // Immediately abort streaming image data.
  abort()

  return extend(base, { type: 'image' as 'image' })
}
