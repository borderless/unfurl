import { Readable } from 'stream'
import extend = require('xtend')
import { Headers, AbortFn, Result, BaseInfo } from '../interfaces'

export function supported ({ encodingFormat }: BaseInfo) {
  return /^video\//.test(encodingFormat)
}

export function handle (base: BaseInfo, headers: Headers, stream: Readable, abort: AbortFn): Result {
  // Immediately abort streaming video data.
  abort()

  return extend(base, { type: 'video' as 'video' })
}
