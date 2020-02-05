import {
  Request,
  Page,
  Plugin,
  Snippet,
  Input,
  Scrape,
  Next,
  ScrapeUrl
} from "./types";
import * as plugins from "./plugins";

// Export built-in plugin support.
export { plugins };

export interface Options {
  request: Request;
  plugins?: Plugin[];
}

/**
 * Default plugins.
 */
export const DEFAULT_PLUGINS = [plugins.htmlmetaparser, plugins.exifdata];

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
  const { request, plugins = DEFAULT_PLUGINS } = options;

  const middleware = plugins.reduce<Next>(
    (next, plugin) => async (x: Input) => plugin(x, next),
    ({ page }: Input): Promise<Snippet> => {
      page.body.resume(); // Discard unused data.

      return Promise.resolve({ type: "unknown", url: page.url });
    }
  );

  return async function scrape(page: Page) {
    const snippet: Snippet = await middleware({ page, scrape, request });
    page.body.destroy(); // Destroy input stream.
    return snippet;
  };
}
