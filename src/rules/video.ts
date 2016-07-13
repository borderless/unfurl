import { Readable } from 'stream'
import extend = require('xtend')
import { Headers, AbortFn, Result, BaseResult } from '../interfaces'

export function supported ({ encodingFormat }: BaseResult) {
  return /^video\//.test(encodingFormat)
}

export function handle (base: BaseResult, headers: Headers, stream: Readable, abort: AbortFn): Result {
  // Immediately abort streaming video data.
  abort()

  return extend(base, { type: 'video' as 'video' })
}
