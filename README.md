# Scrappy

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

> Extract rich metadata from URLs.

## Installation

```sh
npm install scrappy --save
```

## Usage

**Scrappy** uses a simple two step process to extract the metadata from any URL or file. First, it runs through plugin-able `scrapeStream` middleware to extract metadata about the file itself. With the result in hand, it gets passed on to a plugin-able `extract` pipeline to format the metadata for presentation and extract additional metadata about related entities.

### Scraping

#### `scrapeUrl`

```ts
function scrapeUrl(url: string, plugin?: Plugin): Promise<ScrapeResult>
```

Makes the HTTP request and passes the response into `scrapeResponse`.

#### `scrapeResponse`

```ts
function scrapeResponse (res: Response, plugin?: Plugin): Promise<ScrapeResult>
```

Accepts a HTTP response object and transforms it into `scrapeStream`.

#### `scrapeStream`

```ts
function scrapeStream (stream: Readable, input: ScrapeResult, abort?: () => void, plugin = DEFAULT_SCRAPER): Promise<ScrapeResult>
```

Accepts a readable stream and input scrape result (at a minimum should have `url`, but could add other known metadata - e.g. from HTTP headers), and returns the scrape result after running through the plugin function. It also accepts an `abort` function, which can be used to close the stream early.

The default plugins are in the [`plugins/` directory](src/scrape/plugins) and combined into a single pipeline using `compose` (based on `throwback`, but calls `next(stream)` to pass a stream forward).

### Extraction

Extraction is based on a single function, `extract`. It accepts the scrape result, and an optional array of helpers. The default extraction maps the scrape result into a proprietary format useful for applications to visualize. After the extraction is done, it iterates over each of the helper functions to transform the extracted snippet.

Some built-in extraction helpers are available in the [`helpers/` directory](src/extract/helpers), including a default favicon selector and image dimension extraction.

### Example

This example uses [`scrapeAndExtract`](src/index.ts) (a simple wrapper around `scrapeUrl` and `extract`) to retrieve metadata from a webpage. In your own application, you may want to write your own `makeRequest` function or override other parts of the pipeline (e.g. to enable caching or customize the user-agent, etc).

```ts
import { scrapeAndExtract } from 'scrappy'

const url = 'https://medium.com/slack-developer-blog/everything-you-ever-wanted-to-know-about-unfurling-but-were-afraid-to-ask-or-how-to-make-your-e64b4bb9254#.a0wjf4ltt'

scrapeAndExtract(url).then(console.log.bind(console))
```

## Development

```sh
# Build the fixtures directory with raw content.
node scripts/fixtures.js
# Scrape the metadata results from fixtures.
node scripts/scrape.js
# Extract the snippets from the previous results.
node scripts/extract.js
```

## License

Apache 2.0

[npm-image]: https://img.shields.io/npm/v/scrappy.svg?style=flat
[npm-url]: https://npmjs.org/package/scrappy
[downloads-image]: https://img.shields.io/npm/dm/scrappy.svg?style=flat
[downloads-url]: https://npmjs.org/package/scrappy
[travis-image]: https://img.shields.io/travis/blakeembrey/node-scrappy.svg?style=flat
[travis-url]: https://travis-ci.org/blakeembrey/node-scrappy
[coveralls-image]: https://img.shields.io/coveralls/blakeembrey/node-scrappy.svg?style=flat
[coveralls-url]: https://coveralls.io/r/blakeembrey/node-scrappy?branch=master
