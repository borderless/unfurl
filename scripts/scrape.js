var Promise = require('any-promise')
var thenify = require('thenify')
var readdir = thenify(require('fs').readdir)
var writeFile = thenify(require('fs').writeFile)
var readFile = thenify(require('fs').readFile)
var createReadStream = require('fs').createReadStream
var join = require('path').join
var minimatch = require('minimatch')
var match = process.argv[2] || '*'

var scrapeStream = require('../').scrapeStream

var FIXTURE_DIR = join(__dirname, '../test/fixtures')

readdir(FIXTURE_DIR)
  .then(paths => {
    return Promise.all(paths.map(path => {
      var dir = join(FIXTURE_DIR, path)

      // Skip updating entities that are being ignored.
      if (!minimatch(path, match)) {
        return
      }

      return readFile(join(dir, 'meta.json'), 'utf8')
        .then(contents => JSON.parse(contents))
        .then(meta => {
          return scrapeStream(meta.originalUrl, meta.contentUrl, meta.headers, createReadStream(join(dir, 'body')))
        })
        .then(result => {
          return writeFile(join(dir, 'result.json'), JSON.stringify(result, null, 2))
        })
        .then(() => {
          console.log(`Scraped "${path}"`)
        })
    }))
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
