# Unfurl

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

> Extract rich metadata from URLs.

## Installation

```
npm install @borderless/unfurl --save
```

## Usage

**Unfurl** attempts to parse and extract rich structured metadata from URLs.

```js
import { scraper, urlScraper } from "@borderless/unfurl";
import * as plugins from "@borderless/unfurl/dist/plugins";
```

### Scraper

Accepts a `request` function and a list of `plugins` to use. The request is expected to return a "page" object, which is the same shape as the input to `scrape(page)`.

```js
const scrape = scraper({
  request,
  plugins: [plugins.htmlmetaparser, plugins.exifdata],
});

const res = await fetch("http://example.com"); // E.g. `popsicle`.

await scrape({
  url: res.url,
  status: res.status,
  headers: res.headers.asObject(),
  body: res.stream(), // Must stream the request instead of buffering to support large responses.
});
```

### URL Scraper

Simpler wrapper around `scraper` that automatically makes a `request(url)` for the page.

```js
const scrape = urlScraper({ request });

await scrape("http://example.com");
```

## License

Apache 2.0

[npm-image]: https://img.shields.io/npm/v/@borderless/unfurl.svg?style=flat
[npm-url]: https://npmjs.org/package/@borderless/unfurl
[downloads-image]: https://img.shields.io/npm/dm/@borderless/unfurl.svg?style=flat
[downloads-url]: https://npmjs.org/package/@borderless/unfurl
[travis-image]: https://img.shields.io/travis/borderless/unfurl.svg?style=flat
[travis-url]: https://travis-ci.org/borderless/unfurl
[coveralls-image]: https://img.shields.io/coveralls/borderless/unfurl.svg?style=flat
[coveralls-url]: https://coveralls.io/r/borderless/unfurl?branch=master
