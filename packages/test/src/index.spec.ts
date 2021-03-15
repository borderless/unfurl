import { request } from "./index";

describe("test", () => {
  it("should export request", () => {
    expect(request).toBeInstanceOf(Function);
  });
});
