# SaveAsType

Right-click any image and save it as PNG, JPEG, WebP, or AVIF. Fast, local, open-source.

---

## Features

- Right-click any image → choose a format → done
- Per-format quality settings in the popup
- Default format preference reorders the context menu
- Always prompts the save dialog — you stay in control of where files go
- Falls back to downloading the original if conversion is unavailable

## How It Works

SaveAsType uses a Chrome MV3 offscreen document and the Canvas API to convert images locally. No content scripts. No page injection. Nothing runs on the pages you visit.

## Permissions

```
contextMenus   — adds the right-click menu
downloads      — triggers the save dialog with your chosen filename
offscreen      — runs the Canvas API conversion in an isolated document
storage        — saves your quality and format preferences
```

No `tabs`, no `activeTab`, no `scripting`, no `<all_urls>`.

## Format Support

| Format | Availability                        | Quality setting               |
| ------ | ----------------------------------- | ----------------------------- |
| PNG    | Always                              | Lossless — no quality setting |
| JPEG   | Always                              | Adjustable (default 92%)      |
| WebP   | When browser supports canvas export | Adjustable (default 85%)      |
| AVIF   | When browser supports canvas export | Adjustable (default 80%)      |

WebP and AVIF are hidden from the menu and popup when the current browser cannot encode them. If a format becomes unavailable, SaveAsType falls back to downloading the original file.

## Privacy

SaveAsType does not collect, store, or transmit any data. All image conversion happens entirely within your browser using the Canvas API. Images are never uploaded to any server. The extension has no content scripts and does not interact with the pages you visit.

## License

MIT. See [LICENSE](./LICENSE).
