import debug = require('debug')
import Promise = require('any-promise')
import { resolve } from 'url'
import { WritableStream, ParserOptions, Callbacks } from 'htmlparser2'
import { Readable } from 'stream'
import { parse } from 'content-type'

import {
  Headers,
  AbortFn,
  Result,
  HtmlMeta,
  TwitterMeta,
  SailthruMeta,
  DublinCoreMeta,
  RdfaMeta,
  AppLinksMeta
} from '../interfaces'

const log = debug('scrappy:html')

interface RdfaValueMap {
  [tagName: string]: (baseUrl: string, attrs: any) => string
}

/**
 * Keep track of vocabulary prefixes.
 */
const VOCAB_PREFIXES = Object.create(null)

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
VOCAB_PREFIXES.fb = 'http://ogp.me/ns/fb#'
VOCAB_PREFIXES.music = 'http://ogp.me/ns/music#'
VOCAB_PREFIXES.video = 'http://ogp.me/ns/video#'
VOCAB_PREFIXES.article = 'http://ogp.me/ns/article#'
VOCAB_PREFIXES.book = 'http://ogp.me/ns/book#'
VOCAB_PREFIXES.profile = 'http://ogp.me/ns/profile#'
VOCAB_PREFIXES.website = 'http://ogp.me/ns/website#'

/**
 * Grab the correct attribute for RDFa support.
 */
const RDFA_VALUE_MAP: RdfaValueMap = {
  audio (baseUrl, attrs) {
    return attrs.src ? resolve(baseUrl, attrs.src) : undefined
  },
  a (baseUrl, attrs) {
    return attrs.href ? resolve(baseUrl, attrs.href) : undefined
  },
  object (baseUrl, attrs) {
    return attrs.data ? resolve(baseUrl, attrs.data) : undefined
  },
  time (baseUrl, attrs) {
    return attrs.datetime
  }
}

/* tslint:disable */
RDFA_VALUE_MAP['embed'] = RDFA_VALUE_MAP['audio']
RDFA_VALUE_MAP['iframe'] = RDFA_VALUE_MAP['audio']
RDFA_VALUE_MAP['img'] = RDFA_VALUE_MAP['audio']
RDFA_VALUE_MAP['source'] = RDFA_VALUE_MAP['audio']
RDFA_VALUE_MAP['track'] = RDFA_VALUE_MAP['audio']
RDFA_VALUE_MAP['video'] = RDFA_VALUE_MAP['audio']
RDFA_VALUE_MAP['area'] = RDFA_VALUE_MAP['a']
RDFA_VALUE_MAP['link'] = RDFA_VALUE_MAP['a']
/* tslint:enable */

/**
 * Check support for HTML.
 */
export function supported (url: string, headers: Headers) {
  return headers['content-type'] ?
    parse(headers['content-type']).type === 'text/html' :
    false
}

interface Context {
  tagName: string
  text: string
  rdfaTextProperty?: string
  hasRdfaResource?: boolean
  hasRdfaVocab?: boolean
  hasRdfaPrefix?: boolean
  isJsonLd?: boolean
}

export function handle (url: string, headers: Headers, stream: Readable, abort: AbortFn): Promise<Result> {
  return new Promise<Result>((resolve, reject) => {
    const rdfaVocabs: string[] = []
    const rdfaResources: string[] = ['']
    const rdfaPrefixes: any[] = [VOCAB_PREFIXES]
    const contexts: Context[] = [{ tagName: '', text: '' }]

    const options: ParserOptions = {
      decodeEntities: true
    }

    const html: HtmlMeta = Object.create(null)
    const twitter: TwitterMeta = Object.create(null)
    const sailthru: SailthruMeta = Object.create(null)
    const dc: DublinCoreMeta = Object.create(null)
    const rdfa: RdfaMeta = Object.create(null)
    const applinks: AppLinksMeta = Object.create(null)

    let oembedJson: string
    let oembedXml: string

    const result: Result = {
      type: 'html',
      contentUrl: url,
      contentSize: headers['content-length'] ? Number(headers['content-length']) : undefined,
      encodingFormat: 'html',
      dateModified: headers['last-modified'] ? new Date(headers['last-modified'] as string) : undefined,
      meta: {}
    }

    // HTML parser emits text mulitple times, this is a little helper
    // to collect each fragment and use it together.
    function handleText (context: Context) {
      const { tagName, text } = context

      if (context.isJsonLd) {
        try {
          result.meta.jsonLd = JSON.parse(text)
        } catch (e) {
          log(`Failed to parse JSON-LD: "${url}"`)
        }

        return
      }

      if (context.rdfaTextProperty) {
        setRdfaValue(rdfa, last(rdfaResources), context.rdfaTextProperty, normalize(text))
        return
      }

      if (tagName === 'title') {
        html.title = normalize(text)
        return
      }
    }

    const cbs: Callbacks = {
      onopentagname (tagName) {
        contexts.push({ tagName, text: '' })
      },
      onopentag (tagName, attributes) {
        const context = contexts[contexts.length - 1]

        const propertyAttr = normalize((attributes as any).property)
        const vocabAttr = normalize((attributes as any).vocab)
        const prefixAttr = normalize((attributes as any).prefix)
        const resourceAttr = normalize((attributes as any).resource)
        const typeofAttr = normalize((attributes as any).typeof)

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
              log(`Invalid RDFa prefix: "${parts[i]}" "${url}"`)
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
          let value = normalize((attributes as any).content)
          const key = normalizeRdfProperty(propertyAttr, last(rdfaVocabs), last(rdfaPrefixes))

          // Semantic RDFa tags.
          if (!value && RDFA_VALUE_MAP.hasOwnProperty(tagName)) {
            value = normalize(RDFA_VALUE_MAP[tagName](url, attributes))
          }

          // Use only known RDFa keys.
          if (key) {
            if (value != null) {
              setRdfaValue(rdfa, last(rdfaResources), key, value)
            } else {
              context.rdfaTextProperty = key
            }

            return
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
          return
        }

        // Handle meta properties (E.g. HTML, Twitter cards, etc).
        if (tagName === 'meta') {
          const nameAttr = normalize((attributes as any).name)
          const contentAttr = normalize((attributes as any).content)

          if (propertyAttr && contentAttr) {
            if (/^twitter:/.test(propertyAttr)) {
              twitter[propertyAttr.substr(8)] = contentAttr
              return
            }

            if (/^al:/.test(propertyAttr)) {
              applinks[propertyAttr.substr(3)] = contentAttr
              return
            }
          }

          if (nameAttr && contentAttr) {
            if (/^twitter:/.test(nameAttr)) {
              twitter[nameAttr.substr(8)] = contentAttr
              return
            }

            /**
             * Dublin Core metadata.
             */
            if (/^dc\./i.test(nameAttr)) {
              dc[nameAttr.substr(3).toLowerCase()] = contentAttr
              return
            }

            /**
             * Sailthru.
             */
            if (/^sailthru\./.test(nameAttr)) {
              sailthru[nameAttr.substr(9)] = contentAttr
              return
            }

            /**
             * Raw HTML meta tags.
             */
            if (
              nameAttr === 'date' ||
              nameAttr === 'keywords' ||
              nameAttr === 'author' ||
              nameAttr === 'description' ||
              nameAttr === 'language'
            ) {
              html[nameAttr] = contentAttr
              return
            }
          }
        }

        // Detect external metadata opporunities (E.g. OEmbed).
        if (tagName === 'link') {
          const rel = normalize((attributes as any).rel)
          const href = normalize((attributes as any).href)
          const type = normalize((attributes as any).type)

          if (rel && href) {
            if (rel === 'canonical') {
              html.canonical = href
              return
            }

            if (rel === 'alternate') {
              if (type === 'application/json+oembed') {
                oembedJson = href
              } else if (type === 'text/xml+oembed') {
                oembedXml = href
              }

              return
            }
          }
        }

        // Detect metadata scripts (E.g. JSON-LD).
        if (tagName === 'script') {
          if ((attributes as any).type === 'application/ld+json') {
            context.isJsonLd = true
            return
          }
        }

        // Log skipped RDFa properties that weren't caught by other methods.
        if (propertyAttr) {
          log(`Skipped RDFa property: "${propertyAttr}" "${url}"`)
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

        return resolve(result)
      },
      onerror (err: Error) {
        return reject(err)
      }
    }

    stream.pipe(new WritableStream(cbs, options))
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
 * Set an RDF value in the tree.
 */
function setRdfaValue (rdfa: RdfaMeta, resource: string, property: string, value: string) {
  // Avoid setting empty RDFa values.
  if (!value) {
    return
  }

  rdfa[resource] = rdfa[resource] || Object.create(null)

  if (rdfa[resource][property]) {
    if (Array.isArray(rdfa[resource][property])) {
      (rdfa[resource][property] as string[]).push(value)
    } else {
      rdfa[resource][property] = [rdfa[resource][property] as string, value]
    }
  } else {
    rdfa[resource][property] = value
  }
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
