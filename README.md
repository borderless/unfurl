# Scrappy

[![NPM version](https://img.shields.io/npm/v/scrappy.svg?style=flat)](https://npmjs.org/package/scrappy)
[![NPM downloads](https://img.shields.io/npm/dm/scrappy.svg?style=flat)](https://npmjs.org/package/scrappy)
[![Build status](https://img.shields.io/travis/blakeembrey/node-scrappy.svg?style=flat)](https://travis-ci.org/blakeembrey/node-scrappy)
[![Test coverage](https://img.shields.io/coveralls/blakeembrey/node-scrappy.svg?style=flat)](https://coveralls.io/r/blakeembrey/node-scrappy?branch=master)

> Extract rich metadata from URLs.

[Try it using Runkit!](https://runkit.com/blakeembrey/scrappy)

## Installation

```
npm install scrappy --save
```

## Usage

**Scrappy** attempts to parse and extract rich structured metadata from URLs.

```js
import { scraper, urlScraper } from "scrappy";
```

### Scraper

Accepts a `request` function and optional `plugins` array. The request is expected to return a "page" object, which is the same shape as the input to `scrape(page)`.

```js
const scrape = scraper({ request });
const res = await fetch("http://example.com"); // E.g. `popsicle`.

await scrape({
  url: res.url,
  status: res.status,
  headers: res.headers.asObject(),
  body: res.stream() // Must stream the request instead of buffering to support large responses.
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
