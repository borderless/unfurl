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
  },
  {
    name: 'soundcloud-track',
    url: 'https://soundcloud.com/lifeofdesiigner/desiigner-panda'
  },
  {
    name: 'twitter-docs-player',
    url: 'https://dev.twitter.com/cards/types/player'
  },
  {
    name: 'github-homepage',
    url: 'https://github.com/'
  },
  {
    name: 'facebook-homepage',
    url: 'https://www.facebook.com/'
  },
  {
    name: 'twitter-homepage',
    url: 'https://twitter.com/'
  },
  {
    name: 'reddit-homepage',
    url: 'http://www.reddit.com/'
  },
  {
    name: 'reddit-comments',
    url: 'https://www.reddit.com/r/news/comments/4p1enj/uk_man_tried_to_kill_trump_court_papers/'
  },
  {
    name: 'new-com-au-article',
    url: 'http://www.news.com.au/world/breaking-news/uk-man-tried-to-kill-trump-court-papers/news-story/c4116603f54f1b7c88339cd039c7e123'
  },
  {
    name: 'spotify-homepage',
    url: 'https://www.spotify.com/'
  },
  {
    name: 'bestbuy-product-iphone',
    url: 'http://www.bestbuy.com/site/apple-iphone-6s-64gb-space-gray-verizon-wireless/4447801.p?id=bb4447801&skuId=4447801'
  },
  {
    name: 'amazon-smile-product-book',
    url: 'https://smile.amazon.com/gp/product/1937785734/ref=s9_qpp_gw_d99_g14_i5_r?ie=UTF8&fpl=fresh&pf_rd_m=ATVPDKIKX0DER&pf_rd_s=desktop-1&pf_rd_r=92JG667YC8526036ANPR&pf_rd_t=36701&pf_rd_p=6aad23bd-3035-4a40-b691-0eefb1a18396&pf_rd_i=desktop'
  },
  {
    name: 'imdb-inception',
    url: 'http://www.imdb.com/title/tt1375666/'
  },
  {
    name: 'droplr-blog-post',
    url: 'https://droplr.com/droplr-addition-google-chrome-extension'
  },
  {
    name: 'droplr-link',
    url: 'http://d.pr/a/q3z9'
  },
  {
    name: 'itunes-app',
    url: 'https://itunes.apple.com/us/app/espn-sportscenter/id317469184?mt=8'
  },
  {
    name: 'instagram-photo',
    url: 'https://www.instagram.com/p/BG0m4IDGaqk/'
  },
  {
    name: 'wikipedia-article',
    url: 'https://en.wikipedia.org/wiki/TypeScript'
  },
  {
    name: 'mystery-ranch-backpack',
    url: 'http://www.mysteryranch.com/asap-pack'
  },
  {
    name: 'adactio-blog-post',
    url: 'https://adactio.com/journal/9881'
  },
  {
    name: 'linked-in-profile',
    url: 'https://www.linkedin.com/in/blakeembrey'
  },
  {
    name: 'google-maps-location',
    url: 'https://www.google.com/maps/place/Boba+Guys/@37.7600441,-122.4233333,17z/data=!4m5!3m4!1s0x808f7e3cfdb89265:0x8ae0820c41111f70!8m2!3d37.7600017!4d-122.4211124'
  },
  {
    name: 'foursquare-location',
    url: 'https://foursquare.com/v/boba-guys/51abb0a3498eb42c0d5cf324'
  },
  {
    name: 'yelp-location',
    url: 'http://www.yelp.com/biz/boba-guys-san-francisco-4'
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
              url: fixture.url,
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
