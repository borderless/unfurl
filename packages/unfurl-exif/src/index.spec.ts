import { FIXTURE_URLS, request } from "test";
import { urlScraper } from "@borderless/unfurl";
import exif from "./index";

const scrape = urlScraper({ request, plugins: [exif] });

describe("unfurl-exif", () => {
  for (const url of FIXTURE_URLS) {
    it(`should read ${url}`, async () => {
      const result = await scrape(url);
      expect(result).toMatchSnapshot();
    });
  }
});
