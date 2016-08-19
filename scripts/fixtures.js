var Promise = require('any-promise')
var thenify = require('thenify')
var writeFile = thenify(require('fs').writeFile)
var mkdir = thenify(require('fs').mkdir)
var stat = thenify(require('fs').stat)
var join = require('path').join
var filenamify = require('filenamify')
var popsicle = require('popsicle')

var FIXTURE_DIR = join(__dirname, '../test/fixtures')

// Fixtures to store for extraction tests.
var FIXTURES = [
  // Rotten Tomatoes movie.
  'https://www.rottentomatoes.com/m/inception/',
  // Medium blog post.
  'https://medium.com/slack-developer-blog/everything-you-ever-wanted-to-know-about-unfurling-but-were-afraid-to-ask-or-how-to-make-your-e64b4bb9254#.a0wjf4ltt',
  // YouTube video.
  'https://www.youtube.com/watch?v=ZynZdGqxT7Q',
  // Github repo.
  'https://github.com/blakeembrey/popsicle',
  // Microdata article.
  'http://html5doctor.com/microdata/',
  // NYTimes article.
  'http://www.nytimes.com/2016/06/15/opinion/campaign-stops/decoding-donald-trump.html?action=click&module=MostEmailed&region=Lists&pgtype=collection',
  'https://www.airbnb.com/rooms/2250401?checkin=06%2F24%2F2016&checkout=06%2F30%2F2016&guests=1&s=eI3nl9s6',
  // Twitter user.
  'https://twitter.com/blakeembrey',
  // Twitter tweet.
  'https://twitter.com/typescriptlang/status/743113612407889920',
  // Twitter rich tweets.
  'https://twitter.com/ericclemmons/status/749223563790471169',
  'https://twitter.com/alexisohanian/status/764997551384776704',
  'https://twitter.com/SeanTAllen/status/764993929469161472',
  // Imgur image.
  'https://i.imgur.com/mvUPRyV.png',
  // Segment blog post.
  'https://segment.com/blog/the-segment-aws-stack/',
  // Mashable blog post.
  'http://mashable.com/2016/06/17/battle-of-the-bastards-game-of-thrones-fantasy-ending/#L2pP7_P5k5q3',
  // Techcrunch homepage.
  'https://techcrunch.com/',
  // Techcrunch blog post.
  'https://techcrunch.com/2016/06/17/the-europas-awards-2016-honored-the-best-tech-startups-in-europe/',
  // Open Graph Protocol homepage.
  'http://ogp.me/',
  // Learn Standard ML guide.
  'https://learnxinyminutes.com/docs/standard-ml/',
  // Soundcloud.
  'https://soundcloud.com/lifeofdesiigner/desiigner-panda',
  'https://soundcloud.com/tobiasvanschneider/ntmy-episode-1-pieter-levels',
  // Twitter cards dev docs.
  'https://dev.twitter.com/cards/types/player',
  // GitHub homepage.
  'https://github.com/',
  // Facebook homepage.
  'https://www.facebook.com/',
  // Twitter homepage.
  'https://twitter.com/',
  // Reddit homepage.
  'http://www.reddit.com/',
  // Reddit comments.
  'https://www.reddit.com/r/news/comments/4p1enj/uk_man_tried_to_kill_trump_court_papers/',
  // News.com.au article.
  'http://www.news.com.au/world/breaking-news/uk-man-tried-to-kill-trump-court-papers/news-story/c4116603f54f1b7c88339cd039c7e123',
  // Spotify homepage.
  'https://www.spotify.com/',
  // Best Buy product.
  'http://www.bestbuy.com/site/apple-iphone-6s-64gb-space-gray-verizon-wireless/4447801.p?id=bb4447801&skuId=4447801',
  // Amazon Smile product (good cross-domain redirect test).
  'https://smile.amazon.com/gp/product/1937785734/ref=s9_qpp_gw_d99_g14_i5_r?ie=UTF8&fpl=fresh&pf_rd_m=ATVPDKIKX0DER&pf_rd_s=desktop-1&pf_rd_r=92JG667YC8526036ANPR&pf_rd_t=36701&pf_rd_p=6aad23bd-3035-4a40-b691-0eefb1a18396&pf_rd_i=desktop',
  // IMDb movie.
  'http://www.imdb.com/title/tt1375666/',
  // Droplr blog post.
  'https://droplr.com/droplr-addition-google-chrome-extension',
  // Droplr link.
  'http://d.pr/a/q3z9',
  // iTunes app.
  'https://itunes.apple.com/us/app/pokemon-go/id1094591345?mt=8',
  // Instagram photo.
  'https://www.instagram.com/p/BG0m4IDGaqk/',
  // Wikipedia article.
  'https://en.wikipedia.org/wiki/TypeScript',
  // Mystery ranch backpack.
  'http://www.mysteryranch.com/asap-pack',
  // Adactio blog post.
  'https://adactio.com/journal/9881',
  // Google Maps places.
  'https://www.google.com/maps/place/Boba+Guys/@37.7600441,-122.4233333,17z/data=!4m5!3m4!1s0x808f7e3cfdb89265:0x8ae0820c41111f70!8m2!3d37.7600017!4d-122.4211124',
  // Foursquare places.
  'https://foursquare.com/v/boba-guys/51abb0a3498eb42c0d5cf324',
  'https://foursquare.com/v/sydney-opera-house/4b058762f964a5201b8f22e3',
  'https://foursquare.com/v/royal-botanic-garden/4b058761f964a520188f22e3',
  'https://foursquare.com/v/bondi-beach/4b058763f964a520848f22e3',
  'https://foursquare.com/v/darling-harbour/4b058762f964a5201d8f22e3',
  'https://foursquare.com/v/the-baxter-inn/4ed4896c775b45f6ed7b0182',
  'https://foursquare.com/v/mrs-macquaries-point/4b3c2445f964a520348225e3',
  'https://foursquare.com/v/bourke-street-bakery/4b0b4a63f964a520fa2f23e3',
  // Yelp places.
  'http://www.yelp.com/biz/boba-guys-san-francisco-4',
  // Google structured data docs.
  'https://developers.google.com/search/docs/guides/intro-structured-data',
  // Flickr image.
  'https://www.flickr.com/photos/timdrivas/27999498362/in/explore-2016-07-05/',
  // Raw online image.
  'http://html5doctor.com/wp-content/uploads/2011/08/rich-snippet-data2.png',
  // Hacker News homepage (another good redirect test).
  'http://hackerne.ws',
  // Hacker News comments.
  'https://news.ycombinator.com/item?id=12282756',
  // YouTube movie.
  'https://www.youtube.com/watch?v=W9ZnpIGvZUo',
  // iTunes movies.
  'https://itunes.apple.com/us/movie/the-avengers/id533654020',
  // PDFs.
  'https://web.eecs.umich.edu/~mihalcea/papers/mihalcea.emnlp04.pdf',
  'http://web.cs.ucdavis.edu/~rogaway/papers/moral-fn.pdf',
  // Flickr image download.
  'https://c1.staticflickr.com/9/8699/28229743586_cd32cea242_o.jpg',
  'https://c2.staticflickr.com/4/3930/15428630771_61e9dcf6f4_o.jpg',
  // Flickr raw image.
  'https://www.flickr.com/photos/fabianf_/28229743586/sizes/o/',
  // Cloundinary pricing page.
  'http://cloudinary.com/pricing',
  // Stream product page.
  'http://store.steampowered.com/app/8930/',
  // Ebay product page.
  'http://www.ebay.com/itm/Outdoor-Wicker-Patio-Furniture-Sofa-3-Seater-Luxury-Comfort-Brown-Wicker-Couch-/381228738769?&_trksid=p2056016.l4276',
  // Thinkgeek product page.
  'https://www.thinkgeek.com/product/jjip/?pfm=HP_ProdTab_1_7_NewStuff_jjip',
  // Etsy product page.
  'https://www.etsy.com/listing/230389421/agents-of-shield-decal-sticker-for-car?ga_order=most_relevant&ga_search_type=all&ga_view_type=gallery&ga_search_query=&ref=sr_gallery_20',
  // Newegg product page.
  'http://www.newegg.com/Product/Product.aspx?Item=28-840-014',
  // Discourse post.
  'https://discourse.codinghorror.com/t/the-raspberry-pi-has-revolutionized-emulation/4462/29',
  // TEDTalks video.
  'https://www.ted.com/talks/tim_harford_how_messy_problems_can_inspire_creativity',
  // XKCD entry.
  'http://xkcd.com/208/',
  // NPM package page.
  'https://www.npmjs.com/package/filenamify',
  // Schema.org
  'https://schema.org/WebSite',
  // Bandcamp.
  'https://slant6.bandcamp.com/',
  // Gizmodo.
  'http://gizmodo.com/the-dnc-hack-was-much-bigger-than-we-thought-1785145268?utm_campaign=socialflow_gizmodo_twitter&utm_source=gizmodo_twitter&utm_medium=socialflow',
  // The Verge.
  'http://www.theverge.com/2016/8/10/12416766/google-white-house-ostp-emails?utm_campaign=theverge&utm_content=chorus&utm_medium=social&utm_source=twitter',
  // Bjango blog post.
  'https://bjango.com/articles/pngoptimisation/',
  // Bjango product page.
  'https://bjango.com/mac/istatmenus/',
  // Google drive.
  'https://drive.google.com/file/d/0B59Tysg-nEQZOGhsU0U5QXo0Sjg/view?usp=sharing',
  'https://docs.google.com/document/d/1GnsFxQZWERvB5A2cYnmpmNzgH_zAtUsUMQ-th1em2jQ/edit?usp=sharing',
  'https://docs.google.com/spreadsheets/d/1teKblpByMmLaSmRAqDCyLXf0RApcJg3sg4E0MMmfrPg/edit?usp=sharing',
  // Quora.
  'https://www.quora.com/How-do-I-impress-a-computer-programmer-on-a-date',
  // Lifehacker.
  'http://www.lifehacker.com.au/2016/08/some-bill-providers-automatically-update-your-credit-card-when-you-get-a-new-one/',
  // Courses.
  'https://www.khanacademy.org/economics-finance-domain/core-finance/stock-and-bonds/stocks-intro-tutorial/v/bonds-vs-stocks',
  // Contact page.
  'https://www.mulesoft.com/contact'
]

// Read each fixture, populating the raw content.
Promise.all(FIXTURES.map(function (fixtureUrl) {
  var filename = filenamify(fixtureUrl)
  var dir = join(FIXTURE_DIR, filename)

  function fetch () {
    console.log('Fetching "' + fixtureUrl + '"...')

    return popsicle.request({
      url: fixtureUrl,
      headers: {
        'User-Agent': 'Scrappy-LinkExpanding 1.0 (+https://github.com/blakeembrey/node-scrappy)'
      },
      transport: popsicle.createTransport({
        type: 'buffer',
        jar: popsicle.jar(),
        maxBufferSize: 20 * 1000 * 1000
      })
    })
      .then(function (res) {
        return mkdir(dir)
          .then(function () {
            console.log('Writing "' + filename + '"...')

            const meta = {
              originalUrl: fixtureUrl,
              contentUrl: res.url,
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
          console.log('Skipping "' + fixtureUrl + '"...')
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
