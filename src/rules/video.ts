import { Readable } from 'stream'
import Promise = require('any-promise')
import extend = require('xtend')
import { Headers, AbortFn, Result, BaseInfo, Options } from '../interfaces'

export function supported ({ encodingFormat }: BaseInfo) {
  return /^video\//.test(encodingFormat)
}

export function handle (
  base: BaseInfo,
  headers: Headers,
  stream: Readable,
  abort: AbortFn,
  options: Options
): Promise<Result> {
  return options.extractExifData(base.contentUrl, stream, abort)
    .then(exif => {
      return extend(base, { exif, type: 'video' as 'video' })
    })
}
