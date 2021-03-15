import { extractMime } from "./index";

describe("unfurl", () => {
  describe("extractMime", () => {
    it("should get mime type from content-type header", () => {
      expect(extractMime("text/html")).toEqual("text/html");
      expect(extractMime("TEXT/HTML")).toEqual("text/html");
      expect(extractMime("text/html; charset=utf-8")).toEqual("text/html");
    });
  });
});
