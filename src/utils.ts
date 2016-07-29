import Promise = require('any-promise')
import { Readable } from 'stream'
import { exec } from 'exiftool2'
import { AbortFn } from './interfaces'

/**
 * Default options.
 */
export const DEFAULT_OPTIONS = {
  extractExifData
}

/**
 * Extract exif data.
 */
function extractExifData (url: string, stream: Readable, abort: AbortFn) {
  return new Promise((resolve, reject) => {
    const exif = exec(['-fast', '-'])

    exif.on('exif', (exif) => {
      abort()

      return resolve(exif[0])
    })

    exif.on('error', (error) => {
      abort()

      return resolve(null)
    })

    stream.pipe(exif)
  })
}
