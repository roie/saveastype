import { getCanvasQuality, getMimeType, type ImageFormat } from "./conversion";

type ConvertMessage = {
  type: "convert";
  requestId: string;
  src: string;
  format: ImageFormat;
  quality?: number;
  filename: string;
};

type SupportedFormatsMessage = {
  type: "get-supported-formats";
  requestId: string;
};

type OffscreenResponse =
  | {
      type: "supported-formats";
      requestId: string;
      formats: ImageFormat[];
    }
  | {
      type: "download";
      requestId: string;
      url: string;
      filename: string;
    }
  | {
      type: "error";
      requestId: string;
      message: string;
    };

async function loadImage(src: string): Promise<HTMLImageElement> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    image.src = objectUrl;
  });
}

async function convertImage(message: ConvertMessage): Promise<OffscreenResponse> {
  const image = await loadImage(message.src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to create canvas context");
  }

  if (message.format === "jpeg") {
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(image, 0, 0);

  const mimeType = getMimeType(message.format);
  const quality = getCanvasQuality(message.format, message.quality);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Failed to convert image"));
          return;
        }

        resolve(result);
      },
      mimeType,
      quality,
    );
  });

  if (blob.type !== mimeType) {
    throw new Error(
      `Requested ${message.format.toUpperCase()} export is not supported in this browser`,
    );
  }

  return {
    type: "download",
    requestId: message.requestId,
    url: URL.createObjectURL(blob),
    filename: message.filename,
  };
}

async function detectCanvasExportSupport(format: ImageFormat): Promise<boolean> {
  if (format === "png" || format === "jpeg") {
    return true;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  const mimeType = getMimeType(format);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), mimeType, 1);
  });

  return blob?.type === mimeType;
}

async function getSupportedFormats(): Promise<ImageFormat[]> {
  const supportedFormats: ImageFormat[] = [];

  for (const format of ["png", "jpeg", "webp", "avif"] as const) {
    if (await detectCanvasExportSupport(format)) {
      supportedFormats.push(format);
    }
  }

  return supportedFormats;
}

chrome.runtime.onMessage.addListener((message: ConvertMessage | SupportedFormatsMessage) => {
  if (message.type === "convert") {
    void convertImage(message)
      .then((response) => chrome.runtime.sendMessage(response))
      .catch((error: unknown) => {
        const response: OffscreenResponse = {
          type: "error",
          requestId: message.requestId,
          message: error instanceof Error ? error.message : "Failed to convert image",
        };

        return chrome.runtime.sendMessage(response);
      });

    return;
  }

  if (message.type === "get-supported-formats") {
    void getSupportedFormats().then((formats) =>
      chrome.runtime.sendMessage({
        type: "supported-formats",
        requestId: message.requestId,
        formats,
      } satisfies OffscreenResponse),
    );
  }
});
