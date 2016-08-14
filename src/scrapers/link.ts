import { Readable } from 'stream'
import extend = require('xtend')
import { Headers, AbortFn, Result, BaseInfo } from '../interfaces'

export function supported () {
  return true
}

export function handle (base: BaseInfo, headers: Headers, stream: Readable, abort: AbortFn): Result {
  // Immediately abort regular links.
  abort()

  return extend(base, { type: 'link' as 'link' })
}
