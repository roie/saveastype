import { describe, expect, it } from "vitest";

import { buildDownloadFilename } from "../utils/filename";

describe("buildDownloadFilename", () => {
  it("replaces the extension for standard image urls", () => {
    expect(buildDownloadFilename("https://example.com/photo.png", "jpeg")).toBe("photo.jpg");
  });

  it("strips query parameters before deriving the filename", () => {
    expect(buildDownloadFilename("https://example.com/photo.webp?size=large", "png")).toBe(
      "photo.png",
    );
  });

  it("returns the generic filename for blob urls", () => {
    expect(buildDownloadFilename("blob:https://example.com/id", "avif")).toBe("image.avif");
  });

  it("returns the generic filename for data urls", () => {
    expect(buildDownloadFilename("data:image/png;base64,abc", "webp")).toBe("image.webp");
  });

  it("decodes uri components", () => {
    expect(buildDownloadFilename("https://example.com/hello%20world.jpeg", "png")).toBe(
      "hello world.png",
    );
  });

  it("truncates long basenames to 64 characters", () => {
    const longName = "a".repeat(80);
    expect(buildDownloadFilename(`https://example.com/${longName}.png`, "png")).toBe(
      `${"a".repeat(64)}.png`,
    );
  });
});
