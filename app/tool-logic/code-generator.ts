import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

export const BARCODE_FORMATS = [
  {
    value: "CODE128",
    label: "Code 128",
    requirement: "支持可打印 ASCII 字符，适合字母、数字和常见符号。",
    placeholder: "例如：ORDER-2026-001",
    example: "ORDER-2026-001",
  },
  {
    value: "CODE39",
    label: "Code 39",
    requirement: "仅支持大写字母 A–Z、数字 0–9、空格及 - . $ / + %。",
    placeholder: "例如：DEV-TOOLS-39",
    example: "DEV-TOOLS-39",
  },
  {
    value: "EAN13",
    label: "EAN-13",
    requirement: "输入 12 位数字可自动补校验位，或输入校验正确的 13 位数字。",
    placeholder: "例如：400638133393",
    example: "400638133393",
  },
  {
    value: "EAN8",
    label: "EAN-8",
    requirement: "输入 7 位数字可自动补校验位，或输入校验正确的 8 位数字。",
    placeholder: "例如：5512345",
    example: "5512345",
  },
  {
    value: "UPC",
    label: "UPC-A",
    requirement: "输入 11 位数字可自动补校验位，或输入校验正确的 12 位数字。",
    placeholder: "例如：03600029145",
    example: "03600029145",
  },
  {
    value: "ITF14",
    label: "ITF-14",
    requirement: "输入 13 位数字可自动补校验位，或输入校验正确的 14 位数字。",
    placeholder: "例如：1001234500001",
    example: "1001234500001",
  },
] as const;

export type BarcodeFormat = (typeof BARCODE_FORMATS)[number]["value"];

export type QrGenerateOptions = {
  size?: number;
  darkColor?: string;
  lightColor?: string;
  iconDataUrl?: string;
};

export type GeneratedBarcode = {
  dataUrl: string;
  encodedValue: string;
};

const barcodeLengths: Partial<Record<BarcodeFormat, [number, number]>> = {
  EAN13: [12, 13],
  EAN8: [7, 8],
  UPC: [11, 12],
  ITF14: [13, 14],
};

function assertHexColor(value: string, label: string) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${label}必须使用 6 位十六进制颜色`);
}

function calculateGtinCheckDigit(value: string): string {
  let sum = 0;
  for (let index = value.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    sum += Number(value[index]) * (position % 2 === 0 ? 3 : 1);
  }
  return String((10 - (sum % 10)) % 10);
}

export function getBarcodeFormat(format: BarcodeFormat) {
  return BARCODE_FORMATS.find((item) => item.value === format)!;
}

export function validateBarcodeValue(format: BarcodeFormat, input: string): string {
  if (!input) throw new Error("请输入要生成条形码的内容");

  if (format === "CODE128") {
    if (!/^[\x20-\x7e]+$/.test(input)) throw new Error("Code 128 仅支持可打印 ASCII 字符");
    return input;
  }

  if (format === "CODE39") {
    if (!/^[0-9A-Z \-.$/+%]+$/.test(input)) {
      throw new Error("Code 39 仅支持大写字母、数字、空格及 - . $ / + %");
    }
    return input;
  }

  if (!/^\d+$/.test(input)) throw new Error(`${getBarcodeFormat(format).label} 仅支持数字`);
  const [dataLength, fullLength] = barcodeLengths[format]!;
  if (input.length !== dataLength && input.length !== fullLength) {
    throw new Error(`${getBarcodeFormat(format).label} 需要 ${dataLength} 或 ${fullLength} 位数字`);
  }

  if (input.length === dataLength) return `${input}${calculateGtinCheckDigit(input)}`;

  const data = input.slice(0, -1);
  if (calculateGtinCheckDigit(data) !== input.at(-1)) {
    throw new Error(`${getBarcodeFormat(format).label} 校验位不正确`);
  }
  return input;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图标读取失败，请重新选择图片"));
    image.src = dataUrl;
  });
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, size, size, radius);
  context.fill();
}

export async function generateQrDataUrl(
  input: string,
  optionsOrSize: number | QrGenerateOptions = {},
): Promise<string> {
  if (!input.trim()) throw new Error("请输入要生成二维码的内容");

  const options = typeof optionsOrSize === "number" ? { size: optionsOrSize } : optionsOrSize;
  const size = options.size ?? 320;
  const darkColor = options.darkColor ?? "#000000";
  const lightColor = options.lightColor ?? "#ffffff";

  if (!Number.isInteger(size) || size < 128 || size > 1024) {
    throw new Error("二维码尺寸需要在 128–1024 px 之间");
  }
  assertHexColor(darkColor, "前景色");
  assertHexColor(lightColor, "背景色");
  if (darkColor.toLowerCase() === lightColor.toLowerCase()) {
    throw new Error("二维码前景色和背景色不能相同");
  }

  const renderOptions = {
    width: size,
    margin: 2,
    color: { dark: darkColor, light: lightColor },
    errorCorrectionLevel: options.iconDataUrl ? "H" as const : "M" as const,
  };

  if (!options.iconDataUrl) return QRCode.toDataURL(input, renderOptions);
  if (typeof document === "undefined" || typeof Image === "undefined") {
    throw new Error("带图标二维码需要在浏览器中生成");
  }

  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, input, renderOptions);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器不支持二维码图标合成");

  const icon = await loadImage(options.iconDataUrl);
  const iconSize = Math.round(size * 0.2);
  const backingSize = Math.round(size * 0.24);
  const backingOffset = (size - backingSize) / 2;
  context.fillStyle = lightColor;
  drawRoundedRect(context, backingOffset, backingOffset, backingSize, Math.round(size * 0.025));
  const iconOffset = (size - iconSize) / 2;
  context.drawImage(icon, iconOffset, iconOffset, iconSize, iconSize);
  return canvas.toDataURL("image/png");
}

export function generateBarcodeDataUrl(input: string, format: BarcodeFormat): GeneratedBarcode {
  const encodedValue = validateBarcodeValue(format, input);
  if (typeof document === "undefined") throw new Error("条形码需要在浏览器中生成");

  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, encodedValue, {
      format,
      width: 2,
      height: 100,
      displayValue: true,
      background: "#ffffff",
      lineColor: "#000000",
      margin: 12,
      fontSize: 18,
    });
  } catch {
    throw new Error(`${getBarcodeFormat(format).label} 生成失败，请检查输入格式`);
  }
  return { dataUrl: canvas.toDataURL("image/png"), encodedValue };
}
