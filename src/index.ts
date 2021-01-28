import {
  Request,
  Page,
  Plugin,
  Snippet,
  Input,
  Scrape,
  Next,
  ScrapeUrl,
} from "./types";

export interface Options {
  request: Request;
  plugins: Plugin[];
}

/**
 * Wrap `scraper` by using `options.request` to make initial scrape request.
 */
export function urlScraper(options: Options): ScrapeUrl {
  const scrape = scraper(options);

  return async function scrapeUrl(url: string) {
    return scrape(await options.request(url));
  };
}

/**
 * Scraper is composed of middleware returning a snippet.
 */
export function scraper(options: Options): Scrape {
  const { request, plugins } = options;

  const middleware = plugins.reduce<Next>(
    (next, plugin) => async (x: Input) => plugin(x, next),
    ({ page }: Input): Promise<Snippet> => {
      page.body.resume(); // Discard unused data.

      return Promise.resolve({ type: "link", url: page.url });
    }
  );

  return async function scrape(page: Page) {
    const snippet: Snippet = await middleware({ page, scrape, request });
    page.body.destroy(); // Destroy input stream.
    return snippet;
  };
}
