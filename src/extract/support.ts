import { resolve } from 'url'
import { get, Path } from 'getvalue'
import arrify = require('arrify')
import { parse } from 'exif-date'

/**
 * Parse an EXIF date.
 */
export function parseExifDate (value: string | undefined) {
  return value ? parse(value) : undefined
}

/**
 * Export the JSON-LD value interface.
 */
export interface JsonLdValue {
  '@value': string
}

/**
 * Turn an object into a string.
 */
export function toString (value: string | JsonLdValue | undefined): string | undefined {
  return typeof value === 'object' ? value['@value'] : value
}

/**
 * Return a value as a string.
 */
export function getString (obj: any, path: Path): string | undefined {
  const value = get<string | JsonLdValue | string[] | JsonLdValue[] | undefined>(obj, path)

  if (Array.isArray(value)) {
    return toString(value[0])
  }

  return toString(value)
}

/**
 * Return an array of values.
 */
export function getArray (obj: any, path: Path): string[] | undefined {
  const value = get<string | JsonLdValue | string[] | JsonLdValue[] | undefined>(obj, path)

  return value ? arrify<string | JsonLdValue>(value).map(x => toString(x) as string) : undefined
}

/**
 * Convert a string to valid number.
 */
export function toNumber (value: string | JsonLdValue): number | undefined {
  const num = Number(toString(value))

  return isFinite(num) ? num : undefined
}

/**
 * Return a value as a number.
 */
export function getNumber (obj: any, path: Path): number | undefined {
  const str = getString(obj, path)

  return str ? toNumber(str) : undefined
}

/**
 * Convert a string to a valid date.
 */
export function toDate (value: string): Date | undefined {
  const date = new Date(value)

  return isNaN(date.getTime()) ? undefined : date
}

/**
 * Return a value in date format.
 */
export function getDate (obj: any, path: Path): Date | undefined {
  const str = getString(obj, path)

  return str ? toDate(str) : undefined
}

/**
 * Extract a URL from an object.
 */
export function getUrl (obj: any, path: Path, baseUrl: string): string | undefined {
  const value = getString(obj, path)

  if (value) {
    return resolve(baseUrl, value)
  }

  return
}

/**
 * Set defined properties from one object to the other.
 */
export function copyProps (obj: any, data: any) {
  for (const key of Object.keys(data)) {
    if (data[key] != null) {
      obj[key] = data[key]
    }
  }

  return obj
}
