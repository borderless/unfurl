import extend = require('xtend')
import Promise = require('any-promise')
import { Readable } from 'stream'
import { Headers, AbortFn, ImageResult, BaseInfo } from '../interfaces'
import imageSize = require('image-size-stream')
import JPEGDecoder = require('jpg-stream/decoder')

export function supported ({ encodingFormat }: BaseInfo) {
  return /^image\//.test(encodingFormat)
}

export function handle (base: BaseInfo, headers: Headers, stream: Readable, abort: AbortFn): Promise<ImageResult> {
  return new Promise<ImageResult>((resolve, reject) => {
    const result: ImageResult = extend(base, { type: 'image' as 'image' })

    if (base.encodingFormat === 'image/jpeg') {
      const jpeg = new JPEGDecoder()

      jpeg.on('error', reject)

      jpeg.on('format', function (format: any) {
        result.width = format.width
        result.height = format.height
        result.colorSpace = format.colorSpace
      })

      jpeg.on('meta', function (meta: any) {
        result.meta = meta
        resolve(result)

        abort()
      })

      jpeg.on('end', () => resolve(result))

      return stream.pipe(jpeg)
    }

    const size = imageSize()

    size.on('size', function (dimensions: any) {
      result.width = dimensions.width
      result.height = dimensions.height
      abort()
    })

    size.on('error', () => abort())
    size.on('end', () => resolve(result))

    return stream.pipe(size)
  })
}
