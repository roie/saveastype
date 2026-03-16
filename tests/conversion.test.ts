import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  getAvailableFormats,
  getCanvasQuality,
  getEffectiveDefaultFormat,
  getMimeType,
  getQualityPercent,
  sortFormatsByDefault,
} from "../utils/conversion";

describe("conversion helpers", () => {
  it("maps formats to MIME types", () => {
    expect(getMimeType("png")).toBe("image/png");
    expect(getMimeType("jpeg")).toBe("image/jpeg");
    expect(getMimeType("webp")).toBe("image/webp");
    expect(getMimeType("avif")).toBe("image/avif");
  });

  it("omits png canvas quality", () => {
    expect(getCanvasQuality("png", 100)).toBeUndefined();
  });

  it("converts quality percentages to fractions for lossy formats", () => {
    expect(getCanvasQuality("jpeg", 92)).toBe(0.92);
    expect(getCanvasQuality("webp", 85)).toBe(0.85);
    expect(getCanvasQuality("avif", 80)).toBe(0.8);
  });

  it("reads per-format quality from settings", () => {
    expect(getQualityPercent("png", DEFAULT_SETTINGS)).toBeUndefined();
    expect(getQualityPercent("jpeg", DEFAULT_SETTINGS)).toBe(92);
    expect(getQualityPercent("webp", DEFAULT_SETTINGS)).toBe(85);
    expect(getQualityPercent("avif", DEFAULT_SETTINGS)).toBe(80);
  });

  it("orders the default format first", () => {
    expect(sortFormatsByDefault("webp")).toEqual(["webp", "png", "jpeg", "avif"]);
  });

  it("filters unsupported formats after reordering", () => {
    expect(getAvailableFormats("avif", ["png", "jpeg", "webp"])).toEqual(["png", "jpeg", "webp"]);
  });

  it("falls back to the first supported default format", () => {
    expect(getEffectiveDefaultFormat("avif", ["png", "jpeg", "webp"])).toBe("png");
  });
});
