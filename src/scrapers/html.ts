import debug = require('debug')
import arrify = require('arrify')
import Promise = require('any-promise')
import has = require('has')
import { get, createTransport, plugins } from 'popsicle'
import status = require('popsicle-status')
import { resolve as resolveUrl } from 'url'
import { WritableStream, Callbacks } from 'htmlparser2'
import { Readable } from 'stream'
import { parse } from 'content-type'

import {
  Headers,
  AbortFn,
  ScrapeResult,
  ScrapeResultHtml,
  ScrapeResultTwitter,
  ScrapeResultSailthru,
  ScrapeResultDublinCore,
  ScrapeResultAppLinks,
  ScrapeOptions,
  HtmlIconMeta
} from '../interfaces'

const log = debug('scrappy:html')

/**
 * Keep track of vocabulary prefixes.
 */
const KNOWN_VOCABULARIES: { [prefix: string]: string } = {
  // https://www.w3.org/2011/rdfa-context/rdfa-1.1.html
  csvw: 'http://www.w3.org/ns/csvw#',
  dcat: 'http://www.w3.org/ns/dcat#',
  qb: 'http://purl.org/linked-data/cube#',
  grddl: 'http://www.w3.org/2003/g/data-view#',
  ma: 'http://www.w3.org/ns/ma-ont#',
  org: 'http://www.w3.org/ns/org#',
  owl: 'http://www.w3.org/2002/07/owl#',
  prov: 'http://www.w3.org/ns/prov#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfa: 'http://www.w3.org/ns/rdfa#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  rif: 'http://www.w3.org/2007/rif#',
  rr: 'http://www.w3.org/ns/r2rml#',
  sd: 'http://www.w3.org/ns/sparql-service-description#',
  skos: 'http://www.w3.org/2004/02/skos/core#',
  skosxl: 'http://www.w3.org/2008/05/skos-xl#',
  wdr: 'http://www.w3.org/2007/05/powder#',
  void: 'http://rdfs.org/ns/void#',
  wdrs: 'http://www.w3.org/2007/05/powder-s#',
  xhv: 'http://www.w3.org/1999/xhtml/vocab#',
  xml: 'http://www.w3.org/XML/1998/namespace',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  cc: 'https://creativecommons.org/ns#',
  ctag: 'http://commontag.org/ns#',
  dc: 'http://purl.org/dc/terms/',
  dcterms: 'http://purl.org/dc/terms/',
  dc11: 'http://purl.org/dc/elements/1.1/',
  foaf: 'http://xmlns.com/foaf/0.1/',
  gr: 'http://purl.org/goodrelations/v1#',
  ical: 'http://www.w3.org/2002/12/cal/icaltzd#',
  og: 'http://ogp.me/ns#',
  rev: 'http://purl.org/stuff/rev#',
  sioc: 'http://rdfs.org/sioc/ns#',
  v: 'http://rdf.data-vocabulary.org/#',
  vcard: 'http://www.w3.org/2006/vcard/ns#',
  schema: 'http://schema.org/',
  // http://ogp.me/
  music: 'http://ogp.me/ns/music#',
  video: 'http://ogp.me/ns/video#',
  article: 'http://ogp.me/ns/article#',
  book: 'http://ogp.me/ns/book#',
  profile: 'http://ogp.me/ns/profile#',
  website: 'http://ogp.me/ns/website#',
  fb: 'http://ogp.me/ns/fb#'
}

interface JsonLdValue {
  '@value': string
  '@type'?: string
  '@language'?: string
}

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
export function supported ({ encodingFormat }: ScrapeResult) {
  return encodingFormat === 'text/html'
}

interface Context {
  tagName: string
  text: string
  flags: number
  id?: string
  scriptType?: string
  rdfaTextProperty?: string[]
  microdataTextProperty?: string[]
}

const FLAGS = {
  hasLang: (1 << 0),
  rdfaLink: (1 << 1),
  rdfaNode: (1 << 2),
  rdfaVocab: (1 << 3),
  microdataNode: (1 << 4),
  microdataVocab: (1 << 5),
  microdataScope: (1 << 6)
}

export function handle (
  result: ScrapeResult,
  headers: Headers,
  stream: Readable,
  abort: AbortFn,
  options: ScrapeOptions
): Promise<ScrapeResult> {
  const { contentUrl } = result

  result.type = 'html'

  let oembedJsonUrl: string
  let oembedXmlUrl: string

  const scrape = new Promise<ScrapeResult>((resolve, reject) => {
    const html: ScrapeResultHtml = {}
    const twitter: ScrapeResultTwitter = {}
    const sailthru: ScrapeResultSailthru = {}
    const dublincore: ScrapeResultDublinCore = {}
    const applinks: ScrapeResultAppLinks = {}

    let jsonld: any = undefined

    const rdfaRoot: any = {}
    const rdfaNodes: any[] = [{}]
    const rdfaVocabs: string[] = []
    const rdfaRels: Array<{ links: string[], used: boolean }> = []

    const microdataRoot: any = {}
    const microdataRefs: any = {}
    const microdataScopes: string[][] = [[]]
    const microdataNodes: any[] = [{}]

    const langs: string[] = []
    const contexts: Context[] = [{ tagName: '', text: '', flags: 0 }]

    /**
     * Push a value into a JSON-LD graph.
     */
    function pushToGraph (node: any, value: any) {
      node['@graph'] = node['@graph'] || []
      node['@graph'].push(value)
    }

    /**
     * Set a value to the node context.
     */
    function setContext (node: any, key: string, value: string) {
      node['@context'] = node['@context'] || {}
      node['@context'][key] = value
    }

    /**
     * Add a microdata property, with support for `id` references (used via `itemref`).
     */
    function addMicrodataProperty (node: any, id: string, itemprop: string | string[], value: any) {
      addJsonldProperty(node, itemprop, value)

      if (id && has(microdataRefs, id)) {
        addJsonldProperty(microdataRefs[id], itemprop, value)
      }

      if (!has(microdataRoot, '@graph')) {
        pushToGraph(microdataRoot, node)
      }
    }

    /**
     * Set a microdata property.
     */
    function setMicrodataProperty (node: any, id: string, key: string, value: any) {
      node[key] = value

      if (id && has(microdataRefs, id)) {
        microdataRefs[id][key] = value
      }
    }

    /**
     * Add an RDFa property to the node.
     */
    function addRdfaProperty (node: any, property: string | string[], value: any) {
      addJsonldProperty(node, property, value)

      if (!has(rdfaRoot, '@graph')) {
        pushToGraph(rdfaRoot, node)
      }
    }

    /**
     * Correct known prefixes in the context.
     */
    function normalizeRdfaProperty (property: string) {
      const prefix = getPrefix(property)

      if (prefix) {
        if (!has(rdfaRoot, '@context') || !has(rdfaRoot['@context'], prefix)) {
          if (has(KNOWN_VOCABULARIES, prefix)) {
            setContext(rdfaRoot, prefix, KNOWN_VOCABULARIES[prefix])
          }
        }
      } else {
        if (rdfaVocabs.length === 0) {
          return // Omit relative properties when no vocabulary is used.
        }
      }

      return property
    }

    /**
     * Create an RDFa resource.
     */
    function createRdfaResource (id?: string) {
      if (id && has(rdfaRoot, '@graph')) {
        for (const item of rdfaRoot['@graph']) {
          if (item['@id'] === id) {
            return item
          }
        }
      }

      const node: any = { '@id': id }
      pushToGraph(rdfaRoot, node)
      return node
    }

    // HTML parser emits text mulitple times, this is a little helper
    // to collect each fragment and use it together.
    function handleContextEnd (prevContext: Context) {
      const currentContext = last(contexts)
      const { tagName, text } = prevContext
      const value = normalize(text)

      if (prevContext.flags) {
        // This context created a new node.
        if (prevContext.flags & FLAGS.microdataNode) {
          microdataNodes.pop()
        }

        // This context used a new vocabulary.
        if (prevContext.flags & FLAGS.microdataVocab) {
          last(microdataScopes).pop()
        }

        // This context created a new scope altogether.
        if (prevContext.flags & FLAGS.microdataScope) {
          microdataScopes.pop()
        }

        // This context created a new node.
        if (prevContext.flags & FLAGS.rdfaNode) {
          rdfaNodes.pop()
        }

        // This context used a vocabulary.
        if (prevContext.flags & FLAGS.rdfaVocab) {
          rdfaVocabs.pop()
        }

        // This context used an RDFa link (E.g. `rel=""`).
        if (prevContext.flags & FLAGS.rdfaLink) {
          rdfaRels.pop()
        }

        // This context used language property (E.g. `lang=""`).
        if (prevContext.flags & FLAGS.hasLang) {
          langs.pop()
        }
      }

      // Handle parsing significant script elements.
      if (prevContext.scriptType) {
        if (prevContext.scriptType === 'application/ld+json') {
          try {
            const schema = JSON.parse(text)

            jsonld = merge(jsonld, schema)
          } catch (e) {
            log(`Failed to parse JSON-LD: "${contentUrl}"`)
          }
        }

        return
      }

      // Push the previous context text onto the current context.
      currentContext.text += prevContext.text

      if (value) {
        const schemaValue = simplifyJsonLdValue({
          '@value': value,
          '@language': last(langs)
        })

        // Set RDFa to text value.
        if (prevContext.rdfaTextProperty) {
          addRdfaProperty(last(rdfaNodes), prevContext.rdfaTextProperty, schemaValue)
        }

        // Set microdata to text value.
        if (prevContext.microdataTextProperty) {
          addMicrodataProperty(last(microdataNodes), prevContext.id, prevContext.microdataTextProperty, schemaValue)
        }

        // Handle HTML `<title />` tags.
        if (tagName === 'title') {
          html.title = value
        }
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
        contexts.push({ tagName, text: '', flags: 0 })
      },
      onopentag (tagName, attributes) {
        const context = contexts[contexts.length - 1]

        // HTML attributes.
        const relAttr = normalize(attributes['rel'])
        const srcAttr = normalize(attributes['src'])
        const hrefAttr = normalize(attributes['href'])
        const langAttr = normalize(attributes['lang'])
        const typeAttr = normalize(attributes['type'])

        // RDFa attributes.
        const propertyAttr = normalize(attributes['property'])
        const vocabAttr = normalize(attributes['vocab'])
        const prefixAttr = normalize(attributes['prefix'])
        const resourceAttr = normalize(attributes['resource'])
        const typeOfAttr = normalize(attributes['typeof'])
        const aboutAttr = normalize(attributes['about'])

        // Microdata attributes.
        const idAttr = normalize(attributes['id'])
        const itempropAttr = normalize(attributes['itemprop'])
        const itemidAttr = normalize(attributes['itemid'])
        const itemtypeAttr = normalize(attributes['itemtype'])
        const itemrefAttr = normalize(attributes['itemref'])

        // Push the language onto the stack.
        if (langAttr) {
          langs.push(langAttr)
          context.flags = context.flags | FLAGS.hasLang
        }

        // Store `id` references for later (microdata itemrefs).
        if (idAttr) {
          context.id = idAttr

          if (!has(microdataRefs, idAttr)) {
            microdataRefs[idAttr] = {}
          }
        }

        // Microdata item.
        if (attributes.hasOwnProperty('itemscope')) {
          const newNode: any = {}

          // Copy item reference data.
          if (itemrefAttr) {
            const refs = split(itemrefAttr)

            for (const ref of refs) {
              // Set microdata id reference when it doesn't already exist.
              if (microdataRefs[ref] != null) {
                assignJsonldProperties(newNode, microdataRefs[ref])
              }

              microdataRefs[ref] = newNode
            }
          }

          // Set child scopes on the root scope.
          if (itempropAttr) {
            addMicrodataProperty(last(microdataNodes), context.id, split(itempropAttr), newNode)
          } else {
            pushToGraph(microdataRoot, newNode)
            microdataScopes.push([])
            context.flags = context.flags | FLAGS.microdataScope
          }

          // Push the new node as the current scope.
          microdataNodes.push(newNode)
          context.flags = context.flags | FLAGS.microdataNode
        }

        // Microdata `itemprop=""`.
        if (itempropAttr && !(context.flags & FLAGS.microdataNode)) {
          const value = getValueMap(contentUrl, tagName, attributes)
          const props = split(itempropAttr)

          if (value != null) {
            addMicrodataProperty(last(microdataNodes), context.id, props, simplifyJsonLdValue({
              '@value': value,
              '@language': last(langs)
            }))
          } else {
            context.microdataTextProperty = props
          }
        }

        // Microdata `itemid=""`.
        if (itemidAttr) {
          setMicrodataProperty(last(microdataNodes), context.id, '@id', itemidAttr)
        }

        // Microdata `itemtype=""`.
        if (itemtypeAttr) {
          const [vocab, type] = splitItemtype(itemtypeAttr)
          const vocabs = last(microdataScopes)

          if (type && vocab !== last(vocabs)) {
            setContext(last(microdataNodes), '@vocab', vocab)

            vocabs.push(vocab)
            context.flags = context.flags | FLAGS.microdataVocab
          }

          addMicrodataProperty(last(microdataNodes), context.id, '@type', type || itemtypeAttr)
        }

        // RDFa `vocab=""`.
        if (vocabAttr) {
          setContext(last(rdfaNodes), '@vocab', vocabAttr)

          rdfaVocabs.push(vocabAttr)
          context.flags = context.flags | FLAGS.rdfaVocab
        }

        // RDFa `prefix=""`.
        if (prefixAttr) {
          const parts = split(prefixAttr)

          for (let i = 0; i < parts.length; i += 2) {
            const name = parts[i]
            const value = parts[i + 1]
            const prefix = name.slice(0, -1)

            // Detect a valid prefix.
            if (name.charAt(name.length - 1) !== ':' || !isValidName(prefix)) {
              log(`Invalid RDFa prefix: "${name}" "${contentUrl}"`)
              continue
            }

            setContext(rdfaRoot, prefix, value)
          }
        }

        // RDFa `rel=""`. Additional care is taken to avoid extranuous output with HTML `rel` attributes.
        if (relAttr) {
          const links = split(relAttr).map(x => normalizeRdfaProperty(x)).filter(x => !!x)

          if (links.length) {
            rdfaRels.push({ links, used: false })
            context.flags = context.flags | FLAGS.rdfaLink
          }
        }

        // Handle RDFa rel chaining.
        if (rdfaRels.length) {
          const rel = last(rdfaRels)

          if (!rel.used) {
            const validRelId = resourceAttr || hrefAttr || srcAttr

            if (validRelId) {
              const newNode: any = { '@id': validRelId }

              rel.used = true
              addRdfaProperty(last(rdfaNodes), rel.links, newNode)

              if (resourceAttr && !(context.flags & FLAGS.rdfaNode)) {
                rdfaNodes.push(newNode)
                context.flags = context.flags | FLAGS.rdfaNode
              }
            }

            // Support property chaining with `rel`.
            if (!(context.flags & FLAGS.rdfaLink) && (propertyAttr || typeOfAttr)) {
              rel.used = true

              if (!(context.flags & FLAGS.rdfaNode)) {
                const newNode: any = {}

                addRdfaProperty(last(rdfaNodes), rel.links, newNode)

                rdfaNodes.push(newNode)
                context.flags = context.flags | FLAGS.rdfaNode
              }
            }
          }
        }

        // RDFa `about=""`.
        if (aboutAttr) {
          rdfaNodes.push(createRdfaResource(aboutAttr))
          context.flags = context.flags | FLAGS.rdfaNode
        }

        // RDFa `property=""`.
        if (propertyAttr) {
          const value = getValueMap(contentUrl, tagName, attributes)
          const properties = split(propertyAttr).map(x => normalizeRdfaProperty(x))

          if (value != null) {
            addRdfaProperty(last(rdfaNodes), properties, simplifyJsonLdValue({
              '@value': value,
              '@language': last(langs),
              '@type': normalize(attributes['datatype'])
            }))
          } else {
            if ((typeOfAttr || resourceAttr) && !(context.flags & FLAGS.rdfaLink)) {
              const newNode: any = { '@id': resourceAttr }

              addRdfaProperty(last(rdfaNodes), properties, newNode)

              if (typeOfAttr && !(context.flags & FLAGS.rdfaNode)) {
                rdfaNodes.push(newNode)
                context.flags = context.flags | FLAGS.rdfaNode
              }
            } else {
              context.rdfaTextProperty = properties
            }
          }
        }

        // RDFa `resource=""`.
        if (resourceAttr && !propertyAttr && !relAttr && !aboutAttr) {
          rdfaNodes.push(createRdfaResource(resourceAttr))
          context.flags = context.flags | FLAGS.rdfaNode
        }

        // RDFa `typeof=""`.
        if (typeOfAttr) {
          // Standalone `typeof` attribute should be treated as a blank resource.
          if (!rdfaRels.length && !propertyAttr && !relAttr && !resourceAttr && !aboutAttr) {
            rdfaNodes.push(createRdfaResource())
            context.flags = context.flags | FLAGS.rdfaNode
          }

          addRdfaProperty(last(rdfaNodes), '@type', split(typeOfAttr))
        }

        // Handle meta properties (E.g. HTML, Twitter cards, etc).
        if (tagName === 'meta') {
          const nameAttr = normalize(attributes['name'])
          const contentAttr = normalize(attributes['content'])

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
              dublincore[nameAttr.substr(3).toLowerCase()] = contentAttr
            } else if (/^sailthru\./.test(nameAttr)) {
              sailthru[nameAttr.substr(9)] = contentAttr
            } else if (
              nameAttr === 'date' ||
              nameAttr === 'keywords' ||
              nameAttr === 'author' ||
              nameAttr === 'description' ||
              nameAttr === 'language' ||
              nameAttr === 'application-name' ||
              nameAttr === 'apple-mobile-web-app-title'
            ) {
              ;(html as any)[nameAttr] = contentAttr
            }
          }
        }

        // Detect external metadata opporunities (E.g. OEmbed).
        if (tagName === 'link') {
          if (relAttr && hrefAttr) {
            const rels = split(relAttr)

            for (const rel of rels) {
              if (rel === 'canonical') {
                html.canonical = hrefAttr
              }

              if (rel === 'alternate') {
                if (typeAttr === 'application/json+oembed') {
                  oembedJsonUrl = resolveUrl(contentUrl, hrefAttr)
                } else if (typeAttr === 'text/xml+oembed') {
                  oembedXmlUrl = resolveUrl(contentUrl, hrefAttr)
                }
              }

              if (rel === 'icon') {
                pushHtmlIcon({
                  url: resolveUrl(contentUrl, hrefAttr),
                  sizes: normalize(attributes['sizes']),
                  type: typeAttr
                })
              }
            }
          }
        }

        // Detect metadata scripts (E.g. JSON-LD).
        if (tagName === 'script') {
          context.scriptType = typeAttr
        }
      },
      ontext (value) {
        last(contexts).text += value
      },
      onclosetag () {
        const context = contexts.pop()

        handleContextEnd(context)
      },
      onend () {
        // Assign parse results.
        result.html = html
        result.twitter = twitter
        result.sailthru = sailthru
        result.dublincore = dublincore
        result.rdfa = rdfaRoot
        result.applinks = applinks
        result.jsonld = jsonld
        result.microdata = microdataRoot

        return resolve(result)
      },
      onerror (err: Error) {
        return reject(err)
      }
    }

    stream.pipe(new WritableStream(cbs, { decodeEntities: true }))
  })

  return scrape
    .then(function (result) {
      const resolve: Array<Promise<any>> = []

      // Attach OEmbed information to entry.
      if (options.useOEmbed !== false) {
        if (oembedJsonUrl) {
          const req = get({
            url: oembedJsonUrl,
            headers: {
              'User-Agent': options.userAgent
            }
          })
            .use(status(200))
            .use(plugins.parse('json'))
            .then(
              (res) => {
                result.oembed = res.body
              },
              () => {/* Noop request/response errors. */}
            )

          resolve.push(req)
        }
      }

      if (options.fallbackOnFavicon !== false) {
        if (result.html && result.html.icons == null) {
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
              result.html.icons = [{
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
function addJsonldProperty (obj: any, key: string | string[], value: any) {
  // Skip empty keys.
  if (!key) {
    return
  }

  if (Array.isArray(key)) {
    for (const k of key) {
      addJsonldProperty(obj, k, value)
    }
  } else {
    if (!has(obj, key)) {
      obj[key] = merge(undefined, value)
    } else {
      obj[key] = merge(obj[key], value)
    }
  }
}

/**
 * Merge properties together using regular "set" algorithm.
 */
function assignJsonldProperties (obj: any, values: any) {
  for (const key of Object.keys(values)) {
    addJsonldProperty(obj, key, values[key])
  }
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
  const value = normalize(attributes.content)

  if (!value && HTML_VALUE_MAP.hasOwnProperty(tagName)) {
    return normalize(HTML_VALUE_MAP[tagName](url, attributes))
  }

  return value
}

/**
 * Merge values together.
 */
function merge <T> (left: T | T[], right: T | T[]): T | T[] {
  const result = arrify(left).concat(arrify(right))

  return result.length > 1 ? result : result[0]
}

const RDF_VALID_NAME_START_CHAR_RANGE = 'A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6' +
  '\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F' +
  '\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF'

const RDF_NAME_START_CHAR_REGEXP = new RegExp('^[' + RDF_VALID_NAME_START_CHAR_RANGE + ']$')

const RDF_NAME_CHAR_REGEXP = new RegExp(
  '^[' + RDF_VALID_NAME_START_CHAR_RANGE + '\\-\\.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$'
)

/**
 * Check if a prefix is valid.
 */
function isValidName (value: string) {
  return value.length > 1 &&
    RDF_NAME_START_CHAR_REGEXP.test(value.charAt(0)) &&
    RDF_NAME_CHAR_REGEXP.test(value.substr(1))
}

/**
 * Extract the prefix from compact IRIs.
 */
function getPrefix (value: string) {
  const indexOf = value.indexOf(':')

  if (indexOf === -1) {
    return
  }

  if (value.charAt(indexOf + 1) === '/' && value.charAt(indexOf + 2) === '/') {
    return
  }

  return value.substr(0, indexOf)
}

/**
 * Split a space-separated string.
 */
function split (value: string) {
  return value ? value.split(/\s+/g) : []
}

/**
 * Split an `itemtype` microdata property for `@vocab`.
 */
function splitItemtype (value: string) {
  const hashIndexOf = value.lastIndexOf('#')
  const slashIndexOf = value.lastIndexOf('/')

  if (hashIndexOf > -1) {
    return [value.substr(0, hashIndexOf + 1), value.substr(hashIndexOf + 1)]
  }

  if (slashIndexOf > -1) {
    return [value.substr(0, slashIndexOf + 1), value.substr(slashIndexOf + 1)]
  }

  return [value, '']
}

/**
 * Simplify a JSON-LD value for putting into the graph.
 */
function simplifyJsonLdValue (value: JsonLdValue): string | JsonLdValue {
  if (value['@type'] != null || value['@language'] != null) {
    return value
  }

  return value['@value']
}
