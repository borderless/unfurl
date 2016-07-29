import extend = require('xtend')
import Promise = require('any-promise')
import { Readable } from 'stream'
import { Headers, AbortFn, ImageResult, BaseInfo, Options } from '../interfaces'

export function supported ({ encodingFormat }: BaseInfo) {
  return /^image\//.test(encodingFormat)
}

export function handle (
  base: BaseInfo,
  headers: Headers,
  stream: Readable,
  abort: AbortFn,
  options: Options
): Promise<ImageResult> {
  return options.extractExifData(base.contentUrl, stream, abort)
    .then(exif => {
      return extend(base, { exif, type: 'image' as 'image' })
    })
}
