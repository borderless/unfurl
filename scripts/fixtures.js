var Promise = require('any-promise')
var thenify = require('thenify')
var writeFile = thenify(require('fs').writeFile)
var mkdir = thenify(require('fs').mkdir)
var stat = thenify(require('fs').stat)
var join = require('path').join
var popsicle = require('popsicle')

var FIXTURE_DIR = join(__dirname, '../test/fixtures')

// Fixtures to store for extraction tests.
var FIXTURES = [
  {
    name: 'rotten-tomatoes-inception',
    url: 'https://www.rottentomatoes.com/m/inception/'
  },
  {
    name: 'medium-slack-unfurl-article',
    url: 'https://medium.com/slack-developer-blog/everything-you-ever-wanted-to-know-about-unfurling-but-were-afraid-to-ask-or-how-to-make-your-e64b4bb9254#.a0wjf4ltt'
  },
  {
    name: 'youtube-typings-video',
    url: 'https://www.youtube.com/watch?v=ZynZdGqxT7Q'
  },
  {
    name: 'github-repo-popsicle',
    url: 'https://github.com/blakeembrey/popsicle'
  },
  {
    name: 'html5doctor-microdata-article',
    url: 'http://html5doctor.com/microdata/'
  },
  {
    name: 'nytimes-trump-article',
    url: 'http://www.nytimes.com/2016/06/15/opinion/campaign-stops/decoding-donald-trump.html?action=click&module=MostEmailed&region=Lists&pgtype=collection'
  },
  {
    name: 'airbnb-ny-apartment',
    url: 'https://www.airbnb.com/rooms/2250401?checkin=06%2F24%2F2016&checkout=06%2F30%2F2016&guests=1&s=eI3nl9s6'
  },
  {
    name: 'twitter-user',
    url: 'https://twitter.com/blakeembrey'
  },
  {
    name: 'twitter-tweet',
    url: 'https://twitter.com/typescriptlang/status/743113612407889920'
  },
  {
    name: 'imgur-image',
    url: 'https://i.imgur.com/mvUPRyV.png'
  },
  {
    name: 'segment-blog-post',
    url: 'https://segment.com/blog/the-segment-aws-stack/'
  },
  {
    name: 'mashable-blog-post',
    url: 'http://mashable.com/2016/06/17/battle-of-the-bastards-game-of-thrones-fantasy-ending/#L2pP7_P5k5q3'
  },
  {
    name: 'techcrunch-homepage',
    url: 'https://techcrunch.com/'
  },
  {
    name: 'techcrunch-blog-post',
    url: 'https://techcrunch.com/2016/06/17/the-europas-awards-2016-honored-the-best-tech-startups-in-europe/'
  },
  {
    name: 'open-graph-protocol',
    url: 'http://ogp.me/'
  },
  {
    name: 'learn-standard-ml-guide',
    url: 'https://learnxinyminutes.com/docs/standard-ml/'
  }
]

// Read each fixture, populating the raw content.
Promise.all(FIXTURES.map(function (fixture) {
  var dir = join(FIXTURE_DIR, fixture.name)

  function fetch () {
    console.log('Fetching "' + fixture.url + '"...')

    return popsicle.request({
      url: fixture.url,
      options: {
        jar: popsicle.jar()
      }
    })
      .then(function (res) {
        return mkdir(dir)
          .then(function () {
            console.log('Writing "' + fixture.name + '"...')

            const meta = {
              url: res.url,
              headers: res.headers,
              status: res.status,
              statusText: res.statusText
            }

            return Promise.all([
              writeFile(join(dir, 'meta.json'), JSON.stringify(meta, null, 2)),
              writeFile(join(dir, 'body'), res.body)
            ])
          })
      })
  }

  return stat(dir)
    .then(
      function (stats) {
        if (stats.isDirectory()) {
          console.log('Skipping "' + fixture.name + '"...')
          return
        }

        return fetch()
      },
      function () {
        return fetch()
      }
    )
}))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
