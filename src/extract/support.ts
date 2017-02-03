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
 * Return a value as a string.
 */
export function getValue (obj: any, path: Path): string | undefined {
  const value = get<string | string[] | undefined>(obj, path)

  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

/**
 * Return JSON-LD value as a string.
 */
export function getJsonLdValue (obj: any, path: Path): string | undefined {
  const value = get<JsonLdValue | JsonLdValue[] | undefined>(obj, path)

  if (Array.isArray(value)) {
    return value[0] ? value[0]['@value'] : undefined
  }

  return value ? value['@value'] : undefined
}

/**
 * Return an array of values.
 */
export function getArray (obj: any, path: Path): string[] | undefined {
  const value = get<string | string[] | undefined>(obj, path)

  return value ? arrify(value) : undefined
}

/**
 * Return JSON-LD as an array of values.
 */
export function getJsonLdArray (obj: any, path: Path): string[] | undefined {
  const value = get<JsonLdValue | JsonLdValue[] | undefined>(obj, path)

  return value ? arrify(value).map(x => x['@value']) : undefined
}

/**
 * Convert a string to valid number.
 */
export function toNumber (value: string | undefined): number | undefined {
  const num = Number(value)

  return isFinite(num) ? num : undefined
}

/**
 * Convert a string to a valid date.
 */
export function toDate (value: string | undefined): Date | undefined {
  const date = new Date(value || '')

  return isNaN(date.getTime()) ? undefined : date
}

/**
 * Extract a URL from an object.
 */
export function toUrl (value: string | undefined, baseUrl: string): string | undefined {
  return value ? resolve(baseUrl, value) : undefined
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
