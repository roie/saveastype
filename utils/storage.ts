import { DEFAULT_SETTINGS, type Settings } from "./conversion";

export async function getSettings(): Promise<Settings> {
  const values = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return {
    jpegQuality: values.jpegQuality,
    webpQuality: values.webpQuality,
    avifQuality: values.avifQuality,
    defaultFormat: values.defaultFormat,
    stripMetadata: values.stripMetadata,
  };
}

export async function setSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set(settings);
}
