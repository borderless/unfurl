import extend = require('xtend')
import Promise = require('any-promise')
import { Readable, Transform } from 'stream'
import { Headers, AbortFn, ImageResult, BaseInfo } from '../interfaces'
import imageSize = require('image-size-stream')
import JPEGDecoder = require('jpg-stream/decoder')

export function supported ({ encodingFormat }: BaseInfo) {
  return /^image\//.test(encodingFormat)
}

export function handle (base: BaseInfo, headers: Headers, stream: Readable, abort: AbortFn): Promise<ImageResult> {
  return new Promise<ImageResult>((resolve, reject) => {
    const result: ImageResult = extend(base, { type: 'image' as 'image' })
    let extract: Transform

    if (base.encodingFormat === 'image/jpeg') {
      extract = new JPEGDecoder()

      extract.on('format', function (format: any) {
        result.width = format.width
        result.height = format.height
        result.colorSpace = format.colorSpace
      })

      extract.on('meta', function (meta: any) {
        result.meta = meta
        abort()
        resolve(result)
      })
    } else {
      extract = imageSize()

      extract.on('size', function (dimensions: any) {
        result.width = dimensions.width
        result.height = dimensions.height
        abort()
        resolve(result)
      })
    }

    extract.on('error', () => {
      abort()
      resolve(result)
    })

    extract.on('end', () => resolve(result))

    return stream.pipe(extract)
  })
}
