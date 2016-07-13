import { Readable } from 'stream'
import extend = require('xtend')
import { Headers, AbortFn, Result, BaseResult } from '../interfaces'

export function supported ({ encodingFormat }: BaseResult) {
  return /^image\//.test(encodingFormat)
}

export function handle (base: BaseResult, headers: Headers, stream: Readable, abort: AbortFn): Result {
  // Immediately abort streaming image data.
  abort()

  return extend(base, { type: 'image' as 'image' })
}
