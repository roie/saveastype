export const FORMATS = ["png", "jpeg", "webp", "avif"] as const;

export type ImageFormat = (typeof FORMATS)[number];

const MIME_TYPES: Record<ImageFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
};

const DOWNLOAD_EXTENSIONS: Record<ImageFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
  avif: "avif",
};

export type Settings = {
  jpegQuality: number;
  webpQuality: number;
  avifQuality: number;
  defaultFormat: ImageFormat;
  stripMetadata: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  jpegQuality: 92,
  webpQuality: 85,
  avifQuality: 80,
  defaultFormat: "png",
  stripMetadata: false,
};

export function getMimeType(format: ImageFormat): string {
  return MIME_TYPES[format];
}

export function getDownloadExtension(format: ImageFormat): string {
  return DOWNLOAD_EXTENSIONS[format];
}

function getQualitySettingKey(format: ImageFormat): keyof Settings | null {
  switch (format) {
    case "jpeg":
      return "jpegQuality";
    case "webp":
      return "webpQuality";
    case "avif":
      return "avifQuality";
    case "png":
      return null;
  }
}

function clampQuality(value: number): number {
  if (!Number.isFinite(value)) {
    return 100;
  }

  return Math.min(100, Math.max(1, Math.round(value)));
}

export function getQualityPercent(format: ImageFormat, settings: Settings): number | undefined {
  const key = getQualitySettingKey(format);
  return key ? clampQuality(settings[key] as number) : undefined;
}

export function getCanvasQuality(
  format: ImageFormat,
  qualityPercent: number | undefined,
): number | undefined {
  if (format === "png") {
    return undefined;
  }

  return clampQuality(qualityPercent ?? 100) / 100;
}

export function sortFormatsByDefault(defaultFormat: ImageFormat): ImageFormat[] {
  return [...FORMATS].sort((left, right) => {
    if (left === defaultFormat) {
      return -1;
    }

    if (right === defaultFormat) {
      return 1;
    }

    return FORMATS.indexOf(left) - FORMATS.indexOf(right);
  });
}

export function getAvailableFormats(
  defaultFormat: ImageFormat,
  supportedFormats: readonly ImageFormat[] = FORMATS,
): ImageFormat[] {
  return sortFormatsByDefault(defaultFormat).filter((format) => supportedFormats.includes(format));
}

export function getEffectiveDefaultFormat(
  requestedDefault: ImageFormat,
  supportedFormats: readonly ImageFormat[] = FORMATS,
): ImageFormat {
  if (supportedFormats.includes(requestedDefault)) {
    return requestedDefault;
  }

  return supportedFormats[0] ?? "png";
}
