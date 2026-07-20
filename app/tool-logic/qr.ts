import QRCode from "qrcode";

export function generateQrDataUrl(input: string, width = 320): Promise<string> {
  if (!input.trim()) throw new Error("请输入要生成 QR Code 的内容");
  return QRCode.toDataURL(input, { width, margin: 2, errorCorrectionLevel: "M" });
}
