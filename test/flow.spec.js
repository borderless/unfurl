var Promise = require('any-promise')
var test = require('blue-tape')
var thenify = require('thenify')
var readdir = thenify(require('fs').readdir)
var readFile = thenify(require('fs').readFile)
var createReadStream = require('fs').createReadStream
var join = require('path').join
var assert = require('assert')

var scrappy = require('../')

var FIXTURE_DIR = join(__dirname, '../test/fixtures')

test('scraping', t => {
  return readdir(FIXTURE_DIR)
    .then(paths => {
      return Promise.all(paths.map(path => {
        var dir = join(FIXTURE_DIR, path)

        return Promise.all([
          readFile(join(dir, 'meta.json'), 'utf8'),
          readFile(join(dir, 'result.json'), 'utf8'),
          readFile(join(dir, 'snippet.json'), 'utf8'),
        ])
          .then(values => values.map(JSON.parse))
          .then(([meta, result, snippet]) => {
            return scrappy.scrapeStream(meta.url, meta.headers, createReadStream(join(dir, 'body')))
              .then(outResult => {
                t.deepEqual(normalize(outResult), result, 'results should match')

                const outSnippet = scrappy.extract(result)

                t.deepEqual(normalize(outSnippet), snippet, 'snippets should match')
              })
          })
      }))
    })
})

/**
 * Normalize a value to JSON.
 */
function normalize (value) {
  return JSON.parse(JSON.stringify(value))
}
