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

class ConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConversionError";
  }
}

async function loadImageElement(src: string, errorMessage: string): Promise<HTMLImageElement> {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };

    image.onerror = () => {
      reject(new ConversionError(errorMessage));
    };

    image.src = src;
  });
}

async function loadImageFromFetchedBlob(src: string): Promise<HTMLImageElement> {
  const response = await fetch(src);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ConversionError("This site blocked the image request needed for conversion.");
    }

    throw new ConversionError(
      `The image could not be fetched for conversion (${response.status}).`,
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    return await loadImageElement(
      objectUrl,
      blob.type === "image/svg+xml"
        ? "This SVG could not be loaded for conversion."
        : "The image data could not be loaded for conversion.",
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  if (src.startsWith("data:")) {
    return await loadImageElement(src, "This embedded image data could not be read.");
  }

  if (src.startsWith("blob:")) {
    try {
      return await loadImageFromFetchedBlob(src);
    } catch {
      return await loadImageElement(
        src,
        "This temporary blob image could not be accessed for conversion. Try opening the image in a new tab first.",
      );
    }
  }

  return await loadImageFromFetchedBlob(src);
}

async function exportCanvas(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number | undefined,
): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new ConversionError("The browser could not create the converted image file."));
            return;
          }

          resolve(result);
        },
        mimeType,
        quality,
      );
    } catch {
      reject(
        new ConversionError(
          "This image source cannot be exported from canvas in the current browser context.",
        ),
      );
    }
  });
}

async function convertImage(message: ConvertMessage): Promise<OffscreenResponse> {
  const image = await loadImage(message.src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  if (!canvas.width || !canvas.height) {
    throw new ConversionError("The source image did not contain readable dimensions.");
  }

  const context = canvas.getContext("2d");
  if (!context) {
    throw new ConversionError("The browser could not create a canvas for image conversion.");
  }

  if (message.format === "jpeg") {
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(image, 0, 0);

  const mimeType = getMimeType(message.format);
  const quality = getCanvasQuality(message.format, message.quality);
  const blob = await exportCanvas(canvas, mimeType, quality);

  if (blob.type !== mimeType) {
    throw new ConversionError(
      `Requested ${message.format.toUpperCase()} export is not supported in this browser.`,
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
          message:
            error instanceof Error
              ? error.message
              : "This image could not be converted in the browser.",
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
