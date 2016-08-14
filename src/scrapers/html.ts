import debug = require('debug')
import Promise = require('any-promise')
import extend = require('xtend')
import { get, createTransport, plugins } from 'popsicle'
import status = require('popsicle-status')
import { resolve as resolveUrl } from 'url'
import { WritableStream, Callbacks } from 'htmlparser2'
import { Readable } from 'stream'
import { parse } from 'content-type'

import {
  Headers,
  AbortFn,
  BaseInfo,
  HtmlResult,
  HtmlMetaHtml,
  HtmlMetaTwitter,
  HtmlMetaSailthru,
  HtmlMetaDublinCore,
  HtmlMetaRdfa,
  HtmlMetaAppLinks,
  Options,
  HtmlIconMeta
} from '../interfaces'

const log = debug('scrappy:html')

/**
 * Keep track of vocabulary prefixes.
 */
const VOCAB_PREFIXES: any = Object.create(null)

// Set up known, common prefixes.
VOCAB_PREFIXES._ = ''
// https://www.w3.org/2011/rdfa-context/rdfa-1.1.html
VOCAB_PREFIXES.csvw = 'http://www.w3.org/ns/csvw#'
VOCAB_PREFIXES.dcat = 'http://www.w3.org/ns/dcat#'
VOCAB_PREFIXES.qb = 'http://purl.org/linked-data/cube#'
VOCAB_PREFIXES.grddl = 'http://www.w3.org/2003/g/data-view#'
VOCAB_PREFIXES.ma = 'http://www.w3.org/ns/ma-ont#'
VOCAB_PREFIXES.org = 'http://www.w3.org/ns/org#'
VOCAB_PREFIXES.owl = 'http://www.w3.org/2002/07/owl#'
VOCAB_PREFIXES.prov = 'http://www.w3.org/ns/prov#'
VOCAB_PREFIXES.rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
VOCAB_PREFIXES.rdfa = 'http://www.w3.org/ns/rdfa#'
VOCAB_PREFIXES.rdfs = 'http://www.w3.org/2000/01/rdf-schema#'
VOCAB_PREFIXES.rif = 'http://www.w3.org/2007/rif#'
VOCAB_PREFIXES.rr = 'http://www.w3.org/ns/r2rml#'
VOCAB_PREFIXES.sd = 'http://www.w3.org/ns/sparql-service-description#'
VOCAB_PREFIXES.skos = 'http://www.w3.org/2004/02/skos/core#'
VOCAB_PREFIXES.skosxl = 'http://www.w3.org/2008/05/skos-xl#'
VOCAB_PREFIXES.wdr = 'http://www.w3.org/2007/05/powder#'
VOCAB_PREFIXES.void = 'http://rdfs.org/ns/void#'
VOCAB_PREFIXES.wdrs = 'http://www.w3.org/2007/05/powder-s#'
VOCAB_PREFIXES.xhv = 'http://www.w3.org/1999/xhtml/vocab#'
VOCAB_PREFIXES.xml = 'http://www.w3.org/XML/1998/namespace'
VOCAB_PREFIXES.xsd = 'http://www.w3.org/2001/XMLSchema#'
VOCAB_PREFIXES.cc = 'https://creativecommons.org/ns#'
VOCAB_PREFIXES.ctag = 'http://commontag.org/ns#'
VOCAB_PREFIXES.dc = 'http://purl.org/dc/terms/'
VOCAB_PREFIXES.dcterms = 'http://purl.org/dc/terms/'
VOCAB_PREFIXES.dc11 = 'http://purl.org/dc/elements/1.1/'
VOCAB_PREFIXES.foaf = 'http://xmlns.com/foaf/0.1/'
VOCAB_PREFIXES.gr = 'http://purl.org/goodrelations/v1#'
VOCAB_PREFIXES.ical = 'http://www.w3.org/2002/12/cal/icaltzd#'
VOCAB_PREFIXES.og = 'http://ogp.me/ns#'
VOCAB_PREFIXES.rev = 'http://purl.org/stuff/rev#'
VOCAB_PREFIXES.sioc = 'http://rdfs.org/sioc/ns#'
VOCAB_PREFIXES.v = 'http://rdf.data-vocabulary.org/#'
VOCAB_PREFIXES.vcard = 'http://www.w3.org/2006/vcard/ns#'
VOCAB_PREFIXES.schema = 'http://schema.org/'
// http://ogp.me/
VOCAB_PREFIXES.music = 'http://ogp.me/ns/music#'
VOCAB_PREFIXES.video = 'http://ogp.me/ns/video#'
VOCAB_PREFIXES.article = 'http://ogp.me/ns/article#'
VOCAB_PREFIXES.book = 'http://ogp.me/ns/book#'
VOCAB_PREFIXES.profile = 'http://ogp.me/ns/profile#'
VOCAB_PREFIXES.website = 'http://ogp.me/ns/website#'

interface HtmlValueMap {
  [tagName: string]: (baseUrl: string, attrs: any) => string
}

/**
 * Grab the correct attribute for RDFa support.
 */
const HTML_VALUE_MAP: HtmlValueMap = {
  meta (baseUrl, attrs) {
    return attrs.content
  },
  audio (baseUrl, attrs) {
    return attrs.src ? resolveUrl(baseUrl, attrs.src) : undefined
  },
  a (baseUrl, attrs) {
    return attrs.href ? resolveUrl(baseUrl, attrs.href) : undefined
  },
  object (baseUrl, attrs) {
    return attrs.data ? resolveUrl(baseUrl, attrs.data) : undefined
  },
  time (baseUrl, attrs) {
    return attrs.datetime
  },
  data (baseUrl, attrs) {
    return attrs.value
  }
}

/* tslint:disable */
HTML_VALUE_MAP['embed'] = HTML_VALUE_MAP['audio']
HTML_VALUE_MAP['iframe'] = HTML_VALUE_MAP['audio']
HTML_VALUE_MAP['img'] = HTML_VALUE_MAP['audio']
HTML_VALUE_MAP['source'] = HTML_VALUE_MAP['audio']
HTML_VALUE_MAP['track'] = HTML_VALUE_MAP['audio']
HTML_VALUE_MAP['video'] = HTML_VALUE_MAP['audio']
HTML_VALUE_MAP['area'] = HTML_VALUE_MAP['a']
HTML_VALUE_MAP['link'] = HTML_VALUE_MAP['a']
HTML_VALUE_MAP['data'] = HTML_VALUE_MAP['meter']
/* tslint:enable */

/**
 * Check support for HTML.
 */
export function supported ({ encodingFormat }: BaseInfo) {
  return encodingFormat === 'text/html'
}

interface Context {
  tagName: string
  text: string
  id?: string
  rdfaTextProperty?: string
  microdataTextProperty?: string
  hasRdfaResource?: boolean
  hasRdfaVocab?: boolean
  hasRdfaPrefix?: boolean
  isJsonLd?: boolean
  hasMicrodataScope?: boolean
}

export function handle (
  base: BaseInfo,
  headers: Headers,
  stream: Readable,
  abort: AbortFn,
  options: Options
): Promise<HtmlResult> {
  const { contentUrl } = base

  let oembedJson: string
  let oembedXml: string

  const result = new Promise<HtmlResult>((resolve, reject) => {
    const rdfaVocabs: string[] = []
    const rdfaResources: string[] = ['']
    const rdfaPrefixes: any[] = [VOCAB_PREFIXES]
    const microdataIds = Object.create(null)
    const microdataScopes: any[] = []
    const contexts: Context[] = [{ tagName: '', text: '' }]

    const html: HtmlMetaHtml = Object.create(null)
    const twitter: HtmlMetaTwitter = Object.create(null)
    const sailthru: HtmlMetaSailthru = Object.create(null)
    const dc: HtmlMetaDublinCore = Object.create(null)
    const rdfa: HtmlMetaRdfa = Object.create(null)
    const applinks: HtmlMetaAppLinks = Object.create(null)
    const microdata: any[] = []

    const result: HtmlResult = extend(base, { type: 'html' as 'html', meta: {} })

    /**
     * Update microdata with support for `id` references (used via `itemref`).
     */
    function setMicrodata (id: string, itemprop: string, value: string) {
      const scope = last(microdataScopes)
      const props = itemprop.split(/ +/g)

      if (scope) {
        setProperty(scope, props, value)
      }

      if (id && microdataIds[id]) {
        setProperty(microdataIds[id], props, value)
      }
    }

    // HTML parser emits text mulitple times, this is a little helper
    // to collect each fragment and use it together.
    function handleText (context: Context) {
      const { tagName, text } = context

      if (context.isJsonLd) {
        try {
          result.meta.jsonLd = JSON.parse(text)
        } catch (e) {
          log(`Failed to parse JSON-LD: "${contentUrl}"`)
        }

        return
      }

      if (context.rdfaTextProperty) {
        setRdfaValue(rdfa, last(rdfaResources), context.rdfaTextProperty, normalize(text))
      }

      if (context.microdataTextProperty) {
        setMicrodata(context.id, context.microdataTextProperty, normalize(text))
      }

      if (tagName === 'title') {
        html.title = normalize(text)
      }
    }

    function pushHtmlIcon (newIcon: HtmlIconMeta) {
      html.icons = html.icons || []

      for (const icon of html.icons) {
        if (icon.url === newIcon.url) {
          if (icon.type == null) {
            icon.type = newIcon.type
          }

          if (icon.sizes == null) {
            icon.sizes = newIcon.sizes
          }

          return
        }
      }

      html.icons.push(newIcon)
    }

    const cbs: Callbacks = {
      onopentagname (tagName) {
        contexts.push({ tagName, text: '' })
      },
      onopentag (tagName, attributes) {
        const context = contexts[contexts.length - 1]

        // RDFa attributes.
        const propertyAttr = normalize((attributes as any).property)
        const vocabAttr = normalize((attributes as any).vocab)
        const prefixAttr = normalize((attributes as any).prefix)
        const resourceAttr = normalize((attributes as any).resource)
        const typeofAttr = normalize((attributes as any).typeof)

        // Microdata attributes.
        const idAttr = normalize((attributes as any).id)
        const itempropAttr = normalize((attributes as any).itemprop)
        const itemidAttr = normalize((attributes as any).itemid)
        const itemtypeAttr = normalize((attributes as any).itemtype)
        const itemrefAttr = normalize((attributes as any).itemref)

        // Store `id` references for later (microdata itemrefs).
        if (idAttr) {
          context.id = idAttr
          microdataIds[idAttr] = microdataIds[idAttr] || Object.create(null)
        }

        // Microdata item.
        if (attributes.hasOwnProperty('itemscope')) {
          const oldScope = last(microdataScopes)
          const newScope = Object.create(null)

          // Copy item reference data.
          if (itemrefAttr) {
            const refs = itemrefAttr.split(/ +/g)

            for (const ref of refs) {
              // Set microdata id reference when it doesn't already exist.
              if (microdataIds[ref] != null) {
                assignProperties(newScope, microdataIds[ref])
              }

              microdataIds[ref] = newScope
            }
          }

          // Set child scopes on the root scope.
          if (oldScope && itempropAttr) {
            setProperty(oldScope, itempropAttr.split(/ +/g), newScope)
          }

          microdataScopes.push(newScope)
          context.hasMicrodataScope = true
        }

        // Microdata `itemprop=""`.
        if (itempropAttr) {
          const value = getValueMap(contentUrl, tagName, attributes)

          if (value != null) {
            setMicrodata(context.id, itempropAttr, value)
          } else {
            context.microdataTextProperty = itempropAttr
          }
        }

        // Microdata `itemid=""`.
        if (itemidAttr) {
          const scope = last(microdataScopes)

          if (scope) {
            setProperty(scope, '@id', itemidAttr)
          }
        }

        // Microdata `itemtype=""`.
        if (itemtypeAttr) {
          const scope = last(microdataScopes)

          if (scope) {
            setProperty(scope, '@type', itemtypeAttr)
          }
        }

        // RDFa vocab.
        if (vocabAttr) {
          rdfaVocabs.push(vocabAttr)
          context.hasRdfaVocab = true
        }

        // RDFa prefix.
        if (prefixAttr) {
          const parts = prefixAttr.split(' ')
          const prefixes = last(rdfaPrefixes)
          const newPrefixes = Object.create(prefixes)

          for (let i = 0; i < parts.length; i += 2) {
            // Detect a valid prefix.
            if (!/^[\w\_\-]+:$/.test(parts[i])) {
              log(`Invalid RDFa prefix: "${parts[i]}" "${contentUrl}"`)
              continue
            }

            newPrefixes[parts[i].substr(0, -1)] = parts[i + 1]
          }

          rdfaPrefixes.push(newPrefixes)
          context.hasRdfaPrefix = true
        }

        // RDFa resource.
        if (resourceAttr) {
          rdfaResources.push(resourceAttr)
          context.hasRdfaResource = true
        }

        // RDFa property.
        if (propertyAttr) {
          const key = normalizeRdfProperty(propertyAttr, last(rdfaVocabs), last(rdfaPrefixes))
          const value = getValueMap(contentUrl, tagName, attributes)

          // Use only known RDFa keys.
          if (key) {
            if (value != null) {
              setRdfaValue(rdfa, last(rdfaResources), key, value)
            } else {
              context.rdfaTextProperty = key
            }
          }
        }

        // Set the RDFa type.
        if (typeofAttr) {
          setRdfaValue(
            rdfa,
            last(rdfaResources),
            normalizeRdfProperty('rdf:type', last(rdfaVocabs), last(rdfaPrefixes)),
            normalizeRdfProperty(typeofAttr, last(rdfaVocabs), last(rdfaPrefixes))
          )
        }

        // Handle meta properties (E.g. HTML, Twitter cards, etc).
        if (tagName === 'meta') {
          const nameAttr = normalize((attributes as any).name)
          const contentAttr = normalize((attributes as any).content)

          // Catch some bad implementations of Twitter metadata.
          if (propertyAttr && contentAttr) {
            if (/^twitter:/.test(propertyAttr)) {
              twitter[propertyAttr.substr(8)] = contentAttr
            } else if (/^al:/.test(propertyAttr)) {
              applinks[propertyAttr.substr(3)] = contentAttr
            }
          }

          // It's possible someone will do `<meta name="" property="" content="" />`.
          if (nameAttr && contentAttr) {
            /**
             * - Twitter
             * - Dublin Core
             * - Sailthru
             * - HTML
             */
            if (/^twitter:/.test(nameAttr)) {
              twitter[nameAttr.substr(8)] = contentAttr
            } else if (/^dc\./i.test(nameAttr)) {
              dc[nameAttr.substr(3).toLowerCase()] = contentAttr
            } else if (/^sailthru\./.test(nameAttr)) {
              sailthru[nameAttr.substr(9)] = contentAttr
            } else if (
              nameAttr === 'date' ||
              nameAttr === 'keywords' ||
              nameAttr === 'author' ||
              nameAttr === 'description' ||
              nameAttr === 'language'
            ) {
              ;(html as any)[nameAttr] = contentAttr
            }
          }
        }

        // Detect external metadata opporunities (E.g. OEmbed).
        if (tagName === 'link') {
          const rel = normalize((attributes as any).rel)
          const href = normalize((attributes as any).href)
          const type = normalize((attributes as any).type)

          if (rel && href) {
            const rels = rel.split(/\s+/)

            for (const rel of rels) {
              if (rel === 'canonical') {
                html.canonical = href
              }

              if (rel === 'alternate') {
                if (type === 'application/json+oembed') {
                  oembedJson = resolveUrl(contentUrl, href)
                } else if (type === 'text/xml+oembed') {
                  oembedXml = resolveUrl(contentUrl, href)
                }
              }

              if (rel === 'icon') {
                pushHtmlIcon({
                  url: resolveUrl(contentUrl, href),
                  sizes: normalize((attributes as any).sizes),
                  type: normalize((attributes as any).type)
                })
              }
            }
          }
        }

        // Detect metadata scripts (E.g. JSON-LD).
        if (tagName === 'script') {
          if ((attributes as any).type === 'application/ld+json') {
            context.isJsonLd = true
          }
        }

        // Log skipped RDFa properties that weren't caught by other methods.
        if (propertyAttr) {
          log(`Skipped RDFa property: "${propertyAttr}" "${contentUrl}"`)
        }
      },
      ontext (value) {
        last(contexts).text += value
      },
      onclosetag () {
        const context = contexts.pop()

        handleText(context)

        if (context.hasRdfaVocab) {
          rdfaVocabs.pop()
        }

        if (context.hasRdfaPrefix) {
          rdfaPrefixes.pop()
        }

        if (context.hasRdfaResource) {
          rdfaResources.pop()
        }

        if (context.hasMicrodataScope) {
          const scope = microdataScopes.pop()

          // Add to the global microdata scope collector.
          if (microdataScopes.length === 0) {
            microdata.push(scope)
          }
        }
      },
      onend () {
        if (Object.keys(html).length) {
          result.meta.html = html
        }

        if (Object.keys(twitter).length) {
          result.meta.twitter = twitter
        }

        if (Object.keys(sailthru).length) {
          result.meta.sailthru = sailthru
        }

        if (Object.keys(dc).length) {
          result.meta.dc = dc
        }

        if (Object.keys(rdfa).length) {
          result.meta.rdfa = rdfa
        }

        if (Object.keys(applinks).length) {
          result.meta.applinks = applinks
        }

        if (microdata.length) {
          if (microdata.length === 1) {
            result.meta.microdata = microdata[0]
          } else {
            result.meta.microdata = microdata
          }
        }

        return resolve(result)
      },
      onerror (err: Error) {
        return reject(err)
      }
    }

    stream.pipe(new WritableStream(cbs, { decodeEntities: true }))
  })

  return result
    .then(function (result) {
      const resolve: Array<Promise<any>> = []

      // Attach OEmbed information to entry.
      if (options.useOEmbed !== false) {
        if (oembedJson) {
          const req = get({
            url: oembedJson,
            headers: {
              'User-Agent': options.userAgent
            }
          })
            .use(status(200))
            .use(plugins.parse('json'))
            .then(
              (res) => {
                result.meta.oembed = res.body
              },
              () => {/* Noop request/response errors. */}
            )

          resolve.push(req)
        }
      }

      if (options.fallbackOnFavicon !== false) {
        if (result.meta.html && result.meta.html.icons == null) {
          const faviconUrl = resolveUrl(contentUrl, '/favicon.ico')

          const req = get({
            url: faviconUrl,
            headers: {
              'User-Agent': options.userAgent
            },
            transport: createTransport({ type: 'stream' })
          })
            .use(status(200))

          const res = req.then(
            (res) => {
              // Initialize the favicon.
              result.meta.html.icons = [{
                url: faviconUrl,
                type: parse(res.get('content-type')).type
              }]

              // Abort immediately response.
              res.body.on('error', (): void => undefined)
              req.abort()
            },
            () => {/* Noop request/response errors. */}
          )

          resolve.push(res)
        }
      }

      return Promise.all(resolve).then(() => result)
    })
}

/**
 * Normalize a HTML value, trimming and removing whitespace.
 */
function normalize (value?: string): string {
  if (value == null) {
    return
  }

  return value.trim().replace(/\s+/g, ' ')
}

/**
 * Set an object property.
 */
function setProperty (obj: any, key: string | string[], value: any) {
  if (!value) {
    return
  }

  if (Array.isArray(key)) {
    for (const k of key) {
      setProperty(obj, k, value)
    }
  } else {
    if (obj[key]) {
      if (Array.isArray(obj[key])) {
        (obj[key] as string[]).push(value)
      } else {
        obj[key] = [obj[key] as string, value]
      }
    } else {
      obj[key] = value
    }
  }
}

/**
 * Merge properties together using regular "set" algorithm.
 */
function assignProperties (obj: any, values: any) {
  for (const key of Object.keys(values)) {
    setProperty(obj, key, values[key])
  }
}

/**
 * Set an RDF value in the tree.
 */
function setRdfaValue (rdfa: HtmlMetaRdfa, resource: string, property: string, value: string) {
  // Avoid setting empty RDFa values.
  if (!value) {
    return
  }

  rdfa[resource] = rdfa[resource] || Object.create(null)

  setProperty(rdfa[resource], property, value)
}

/**
 * Normalize an RDF property.
 */
function normalizeRdfProperty (property: string, vocab: string, prefixes: { [key: string]: string }) {
  const m = /^([\w\_\-]+):(\S+)/.exec(property)

  if (!m) {
    if (!vocab) {
      return
    }

    return vocab + property
  }

  const name = m[1]

  if (prefixes[name]) {
    return prefixes[name] + m[2]
  }

  return
}

/**
 * Get the last element in a stack.
 */
function last <T> (arr: T[]): T {
  return arr[arr.length - 1]
}

/**
 * Grab the semantic value from HTML.
 */
function getValueMap (url: string, tagName: string, attributes: any) {
  const value = normalize((attributes as any).content)

  if (!value && HTML_VALUE_MAP.hasOwnProperty(tagName)) {
    return normalize(HTML_VALUE_MAP[tagName](url, attributes))
  }

  return value
}
