import { md5, sha1 } from "@noble/hashes/legacy.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export type CodecGroup = "encode" | "decode";

export type CodecMethod = {
  id: string;
  label: string;
  description: string;
  group: CodecGroup;
};

export const codecMethods: CodecMethod[] = [
  { id: "unicode-encode", label: "Unicode编码", description: "\\u 开头", group: "encode" },
  { id: "url-encode", label: "URL编码", description: "% 开头", group: "encode" },
  { id: "utf16-encode", label: "UTF16编码", description: "\\x 开头", group: "encode" },
  { id: "base64-encode", label: "Base64编码", description: "UTF-8 文本", group: "encode" },
  { id: "md5", label: "MD5计算", description: "输出 32 位摘要", group: "encode" },
  { id: "hex-encode", label: "十六进制编码", description: "UTF-8 字节", group: "encode" },
  { id: "sha1", label: "Sha1加密", description: "输出 40 位摘要", group: "encode" },
  { id: "html-encode", label: "HTML普通编码", description: "转义特殊字符", group: "encode" },
  { id: "html-deep-encode", label: "HTML深度编码", description: "全部转为实体", group: "encode" },
  { id: "html-to-js", label: "HTML转JS", description: "转为 JS 字符串", group: "encode" },
  { id: "gzip-compress", label: "Gzip压缩", description: "输出 Base64", group: "encode" },
  { id: "string-escape", label: "字符串转义", description: "转义控制字符", group: "encode" },
  { id: "unicode-decode", label: "Unicode解码", description: "\\u 开头", group: "decode" },
  { id: "url-decode", label: "URL解码", description: "% 开头", group: "decode" },
  { id: "utf16-decode", label: "UTF16解码", description: "\\x 开头", group: "decode" },
  { id: "base64-decode", label: "Base64解码", description: "还原 UTF-8", group: "decode" },
  { id: "hex-decode", label: "Hex/ASCII解码", description: "十六进制转文本", group: "decode" },
  { id: "proto-hex", label: "Proto Hex解析", description: "转 JSON", group: "decode" },
  { id: "html-decode", label: "HTML实体解码", description: "还原实体字符", group: "decode" },
  { id: "url-params", label: "URL参数解析", description: "转 JSON", group: "decode" },
  { id: "jwt-decode", label: "JWT解码", description: "不校验签名", group: "decode" },
  { id: "cookie-format", label: "Cookie格式化", description: "逐项换行", group: "decode" },
  { id: "gzip-decompress", label: "Gzip解压", description: "输入 Base64", group: "decode" },
  { id: "string-unescape", label: "字符串去转义", description: "还原控制字符", group: "decode" },
];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(input: string) {
  const normalized = input.trim().replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function parseHexBytes(input: string) {
  const normalized = input
    .replace(/0x/gi, "")
    .replace(/[\s,;:_-]/g, "");
  if (!normalized || normalized.length % 2 !== 0 || /[^0-9a-f]/i.test(normalized)) {
    throw new Error("请输入有效的偶数位十六进制内容");
  }
  return Uint8Array.from(normalized.match(/.{2}/g) ?? [], (value) => Number.parseInt(value, 16));
}

function encodeUnicode(input: string) {
  let output = "";
  for (let index = 0; index < input.length; index += 1) {
    output += `\\u${input.charCodeAt(index).toString(16).padStart(4, "0")}`;
  }
  return output;
}

function decodeUnicode(input: string) {
  return input.replace(
    /\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})/gi,
    (_, braced: string | undefined, fixed: string | undefined) => {
      const value = Number.parseInt(braced ?? fixed ?? "", 16);
      return braced ? String.fromCodePoint(value) : String.fromCharCode(value);
    },
  );
}

function encodeUtf16(input: string) {
  let output = "";
  for (let index = 0; index < input.length; index += 1) {
    output += `\\x${input.charCodeAt(index).toString(16).padStart(4, "0")}`;
  }
  return output;
}

function decodeUtf16(input: string) {
  return input.replace(/\\x([0-9a-f]{4})/gi, (_, value: string) =>
    String.fromCharCode(Number.parseInt(value, 16)),
  );
}

function encodeHtml(input: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return input.replace(/[&<>"']/g, (character) => entities[character]);
}

function decodeHtml(input: string) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = input;
  return textarea.value;
}

function deepEncodeHtml(input: string) {
  return Array.from(input, (character) => `&#${character.codePointAt(0)};`).join("");
}

function parseUrlParams(input: string) {
  const trimmed = input.trim();
  let query = trimmed;
  try {
    query = new URL(trimmed).search;
  } catch {
    const questionMark = trimmed.indexOf("?");
    if (questionMark >= 0) query = trimmed.slice(questionMark + 1).split("#", 1)[0];
  }
  const params = new URLSearchParams(query.replace(/^\?/, ""));
  const result: Record<string, string | string[]> = {};
  params.forEach((value, key) => {
    const current = result[key];
    if (current === undefined) result[key] = value;
    else if (Array.isArray(current)) current.push(value);
    else result[key] = [current, value];
  });
  return JSON.stringify(result, null, 2);
}

function decodeJwt(input: string) {
  const parts = input.trim().split(".");
  if (parts.length < 2) throw new Error("JWT 至少需要包含 header 和 payload 两部分");
  const parsePart = (part: string) => JSON.parse(decoder.decode(base64ToBytes(part)));
  return JSON.stringify({ header: parsePart(parts[0]), payload: parsePart(parts[1]) }, null, 2);
}

function formatCookie(input: string) {
  return input
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(";\n");
}

function unescapeString(input: string) {
  return decodeUnicode(input)
    .replace(/\\x([0-9a-f]{2})/gi, (_, value: string) =>
      String.fromCharCode(Number.parseInt(value, 16)),
    )
    .replace(/\\([nrtbfv0\\"'])/g, (_, escape: string) => {
      const values: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        b: "\b",
        f: "\f",
        v: "\v",
        "0": "\0",
        "\\": "\\",
        '"': '"',
        "'": "'",
      };
      return values[escape];
    });
}

async function gzipCompress(input: string) {
  if (typeof CompressionStream === "undefined") {
    throw new Error("当前浏览器不支持 Gzip 压缩");
  }
  const stream = new Blob([encoder.encode(input)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return bytesToBase64(new Uint8Array(await new Response(stream).arrayBuffer()));
}

async function gzipDecompress(input: string) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("当前浏览器不支持 Gzip 解压");
  }
  const stream = new Blob([base64ToBytes(input)])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return decoder.decode(await new Response(stream).arrayBuffer());
}

function readVarint(bytes: Uint8Array, start: number): [bigint, number] {
  let value = 0n;
  let shift = 0n;
  let index = start;
  while (index < bytes.length && shift <= 63n) {
    const byte = bytes[index];
    value |= BigInt(byte & 0x7f) << shift;
    index += 1;
    if ((byte & 0x80) === 0) return [value, index];
    shift += 7n;
  }
  throw new Error("Proto Hex 中包含无效的 varint");
}

function protoScalar(value: bigint) {
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
}

function appendProtoField(result: Record<string, unknown>, key: string, value: unknown) {
  const current = result[key];
  if (current === undefined) result[key] = value;
  else if (Array.isArray(current)) current.push(value);
  else result[key] = [current, value];
}

function parseProtoHex(input: string) {
  const bytes = parseHexBytes(input);
  const result: Record<string, unknown> = {};
  let index = 0;

  while (index < bytes.length) {
    const [tag, nextIndex] = readVarint(bytes, index);
    index = nextIndex;
    const fieldNumber = Number(tag >> 3n);
    const wireType = Number(tag & 7n);
    if (fieldNumber <= 0) throw new Error("Proto Hex 中包含无效字段编号");
    const key = `field_${fieldNumber}`;
    let value: unknown;

    if (wireType === 0) {
      const [varint, end] = readVarint(bytes, index);
      value = protoScalar(varint);
      index = end;
    } else if (wireType === 1 || wireType === 5) {
      const length = wireType === 1 ? 8 : 4;
      if (index + length > bytes.length) throw new Error("Proto Hex 固定长度字段不完整");
      value = `0x${bytesToHex(bytes.slice(index, index + length))}`;
      index += length;
    } else if (wireType === 2) {
      const [lengthValue, contentStart] = readVarint(bytes, index);
      const length = Number(lengthValue);
      const end = contentStart + length;
      if (!Number.isSafeInteger(length) || end > bytes.length) {
        throw new Error("Proto Hex 长度字段不完整");
      }
      const content = bytes.slice(contentStart, end);
      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(content);
        value = /^[\p{L}\p{N}\p{P}\p{Z}\s]*$/u.test(text) ? text : `0x${bytesToHex(content)}`;
      } catch {
        value = `0x${bytesToHex(content)}`;
      }
      index = end;
    } else {
      throw new Error(`暂不支持 Proto wire type ${wireType}`);
    }

    appendProtoField(result, key, value);
  }

  return JSON.stringify(result, null, 2);
}

export async function runCodec(methodId: string, input: string): Promise<string> {
  switch (methodId) {
    case "unicode-encode":
      return encodeUnicode(input);
    case "url-encode":
      return encodeURIComponent(input);
    case "utf16-encode":
      return encodeUtf16(input);
    case "base64-encode":
      return bytesToBase64(encoder.encode(input));
    case "md5":
      return bytesToHex(md5(encoder.encode(input)));
    case "hex-encode":
      return bytesToHex(encoder.encode(input));
    case "sha1":
      return bytesToHex(sha1(encoder.encode(input)));
    case "html-encode":
      return encodeHtml(input);
    case "html-deep-encode":
      return deepEncodeHtml(input);
    case "html-to-js":
      return JSON.stringify(input);
    case "gzip-compress":
      return gzipCompress(input);
    case "string-escape":
      return JSON.stringify(input).slice(1, -1);
    case "unicode-decode":
      return decodeUnicode(input);
    case "url-decode":
      return decodeURIComponent(input.replace(/\+/g, " "));
    case "utf16-decode":
      return decodeUtf16(input);
    case "base64-decode":
      return decoder.decode(base64ToBytes(input));
    case "hex-decode":
      return decoder.decode(parseHexBytes(input));
    case "proto-hex":
      return parseProtoHex(input);
    case "html-decode":
      return decodeHtml(input);
    case "url-params":
      return parseUrlParams(input);
    case "jwt-decode":
      return decodeJwt(input);
    case "cookie-format":
      return formatCookie(input);
    case "gzip-decompress":
      return gzipDecompress(input);
    case "string-unescape":
      return unescapeString(input);
    default:
      throw new Error("请选择有效的转换方式");
  }
}
