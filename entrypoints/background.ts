import { defineBackground } from "wxt/utils/define-background";
import {
  FORMATS,
  getAvailableFormats,
  getEffectiveDefaultFormat,
  getQualityPercent,
  type ImageFormat,
} from "../utils/conversion";
import { buildDownloadFilename } from "../utils/filename";
import { getSettings } from "../utils/storage";

const MENU_PARENT_ID = "saveastype";
const OFFSCREEN_PATH = "/offscreen.html";
const OFFSCREEN_REASON = "BLOBS";
const OFFSCREEN_JUSTIFICATION =
  "Image format conversion using Canvas API requires an offscreen document";
const DOWNLOAD_URL_REVOKE_DELAY_MS = 5000;

type ConvertMessage = {
  type: "convert";
  requestId: string;
  src: string;
  format: ImageFormat;
  quality?: number;
  filename: string;
};

type DownloadResponse = {
  type: "download";
  requestId: string;
  url: string;
  filename: string;
};

type SupportedFormatsResponse = {
  type: "supported-formats";
  requestId: string;
  formats: ImageFormat[];
};

type ErrorResponse = {
  type: "error";
  requestId: string;
  message: string;
};

type OffscreenResponse = SupportedFormatsResponse | DownloadResponse | ErrorResponse;

function createRequestId(): string {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

function getMenuTitle(format: ImageFormat): string {
  switch (format) {
    case "png":
      return "PNG";
    case "jpeg":
      return "JPEG";
    case "webp":
      return "WebP";
    case "avif":
      return "AVIF";
  }
}

function getMenuItemId(format: ImageFormat): string {
  return `save-as-${format}`;
}

function getFormatFromMenuItem(menuItemId: string): ImageFormat | null {
  const format = menuItemId.replace("save-as-", "");
  return FORMATS.includes(format as ImageFormat) ? (format as ImageFormat) : null;
}

async function rebuildContextMenus(
  defaultFormat: ImageFormat,
  supportedFormats: readonly ImageFormat[] = FORMATS,
): Promise<void> {
  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: MENU_PARENT_ID,
    title: "SaveAsType",
    contexts: ["image"],
  });

  for (const format of getAvailableFormats(defaultFormat, supportedFormats)) {
    chrome.contextMenus.create({
      id: getMenuItemId(format),
      parentId: MENU_PARENT_ID,
      title: getMenuTitle(format),
      contexts: ["image"],
    });
  }
}

async function ensureOffscreenDocument(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)],
  });

  if (contexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [OFFSCREEN_REASON],
    justification: OFFSCREEN_JUSTIFICATION,
  });
}

async function requestConversion(message: ConvertMessage): Promise<DownloadResponse> {
  return await new Promise<DownloadResponse>((resolve, reject) => {
    const handleMessage = (response: OffscreenResponse): void => {
      if (response.requestId !== message.requestId) {
        return;
      }

      chrome.runtime.onMessage.removeListener(handleMessage);

      if (response.type === "download") {
        resolve(response);
        return;
      }

      reject(
        new Error(response.type === "error" ? response.message : "Unexpected offscreen response"),
      );
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    chrome.runtime.sendMessage(message).catch((error: unknown) => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      reject(error instanceof Error ? error : new Error("Failed to send conversion request"));
    });
  });
}

async function getSupportedFormatsFromOffscreen(): Promise<ImageFormat[]> {
  const requestId = createRequestId();

  return await new Promise<ImageFormat[]>((resolve, reject) => {
    const handleMessage = (response: OffscreenResponse): void => {
      if (response.requestId !== requestId) {
        return;
      }

      chrome.runtime.onMessage.removeListener(handleMessage);

      if (response.type === "supported-formats") {
        resolve(response.formats);
        return;
      }

      reject(
        new Error(response.type === "error" ? response.message : "Unexpected offscreen response"),
      );
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    chrome.runtime
      .sendMessage({
        type: "get-supported-formats",
        requestId,
      })
      .catch((error: unknown) => {
        chrome.runtime.onMessage.removeListener(handleMessage);
        reject(error instanceof Error ? error : new Error("Failed to detect supported formats"));
      });
  });
}

async function fallbackDownload(srcUrl: string): Promise<void> {
  await chrome.downloads.download({
    url: srcUrl,
    saveAs: true,
  });
}

function getReadableFallbackMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The image could not be converted, so SaveAsType will try downloading the original file.";
}

async function handleMenuClick(info: chrome.contextMenus.OnClickData): Promise<void> {
  if (!info.menuItemId || typeof info.menuItemId !== "string") {
    return;
  }

  const format = getFormatFromMenuItem(info.menuItemId);
  const srcUrl = info.srcUrl;
  if (!format || !srcUrl) {
    return;
  }

  try {
    await ensureOffscreenDocument();
    const supportedFormats = await getSupportedFormatsFromOffscreen();
    if (!supportedFormats.includes(format)) {
      await fallbackDownload(srcUrl);
      return;
    }

    const settings = await getSettings();
    const filename = buildDownloadFilename(srcUrl, format);
    const quality = getQualityPercent(format, settings);
    const response = await requestConversion({
      type: "convert",
      requestId: createRequestId(),
      src: srcUrl,
      format,
      quality,
      filename,
    });

    await chrome.downloads.download({
      url: response.url,
      filename: response.filename,
      saveAs: true,
    });

    setTimeout(() => {
      URL.revokeObjectURL(response.url);
    }, DOWNLOAD_URL_REVOKE_DELAY_MS);
  } catch (error) {
    const message = getReadableFallbackMessage(error);
    console.warn(`SaveAsType: ${message}`);

    try {
      await fallbackDownload(srcUrl);
    } catch (fallbackError) {
      console.error(
        `SaveAsType: ${message} Original download fallback also failed.`,
        fallbackError,
      );
    }
  }
}

async function syncContextMenus(): Promise<void> {
  const settings = await getSettings();
  await ensureOffscreenDocument();
  const supportedFormats = await getSupportedFormatsFromOffscreen();
  const defaultFormat = getEffectiveDefaultFormat(settings.defaultFormat, supportedFormats);
  await rebuildContextMenus(defaultFormat, supportedFormats);
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(async () => {
    await syncContextMenus();
  });

  chrome.runtime.onStartup.addListener(async () => {
    await syncContextMenus();
  });

  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== "sync" || !changes.defaultFormat?.newValue) {
      return;
    }

    await syncContextMenus();
  });

  chrome.contextMenus.onClicked.addListener((info) => {
    void handleMenuClick(info);
  });
});
