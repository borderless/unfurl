var thenify = require('thenify')
var popsicle = require('popsicle')
var writeFile = thenify(require('fs').writeFile)
var join = require('path').join

popsicle.request('http://oembed.com/providers.json')
  .then(res => {
    var data = JSON.stringify(JSON.parse(res.body), null, 2)

    return writeFile(join(__dirname, '../vendor/providers.json'), data)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
