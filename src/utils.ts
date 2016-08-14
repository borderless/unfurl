import Promise = require('any-promise')
import arrify = require('arrify')
import { Readable } from 'stream'
import { exec } from 'exiftool2'
import { get, Path } from 'getvalue'
import { resolve } from 'url'
import { AbortFn, Options } from './interfaces'

/**
 * Default options.
 */
export const DEFAULT_OPTIONS: Options = {
  extractExifData
}

/**
 * Extract exif data.
 */
export function extractExifData (url: string, stream: Readable, abort: AbortFn) {
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

/**
 * Return a value as a string.
 */
export function getString (obj: any, path: Path): string {
  const value = get<any>(obj, path)

  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    if (typeof value[0] === 'string') {
      return value[0]
    }
  }
}

/**
 * Return an array of values.
 */
export function getArray (obj: any, path: Path): string[] {
  const value = get<any>(obj, path)

  return value ? arrify(value) : undefined
}

/**
 * Convert a string to valid number.
 */
export function toNumber (value: string): number {
  const num = Number(value)

  return isFinite(num) ? num : undefined
}

/**
 * Return a value as a number.
 */
export function getNumber (obj: any, path: Path): number {
  return toNumber(getString(obj, path))
}

/**
 * Convert a string to a valid date.
 */
export function toDate (value: string): Date {
  const date = new Date(value)

  return isNaN(date.getTime()) ? undefined : date
}

/**
 * Return a value in date format.
 */
export function getDate (obj: any, path: Path): Date {
  return toDate(getString(obj, path))
}

/**
 * Extract a URL from an object.
 */
export function getUrl (obj: any, path: Path, baseUrl: string): string {
  const value = getString(obj, path)

  if (value) {
    return resolve(baseUrl, value)
  }
}

/**
 * Set defined properties from one object to the other.
 */
export function assignProps (obj: any, data: any) {
  for (const key of Object.keys(data)) {
    if (data[key] != null) {
      obj[key] = data[key]
    }
  }

  return obj
}
