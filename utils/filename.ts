import { getDownloadExtension, type ImageFormat } from "./conversion";

const SOURCE_EXTENSION_PATTERN = /\.(jpe?g|png|webp|avif|gif|bmp|svg|ico|tiff?)$/i;
const MAX_BASENAME_LENGTH = 64;

function decodeFileComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function buildDownloadFilename(src: string, format: ImageFormat): string {
  const extension = getDownloadExtension(format);

  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return `image.${extension}`;
  }

  const withoutQuery = src.split("?")[0] ?? "";
  const basename = withoutQuery.split("/").pop() ?? "";
  const decoded = decodeFileComponent(basename).trim();
  const stripped = decoded.replace(SOURCE_EXTENSION_PATTERN, "");
  const normalized = stripped || "image";
  const truncated = normalized.slice(0, MAX_BASENAME_LENGTH);

  return `${truncated}.${extension}`;
}
