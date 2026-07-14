const HEX = "0123456789abcdef";
const TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => HEX[byte >> 4] + HEX[byte & 15]).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateUuidV4(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

export function generateUuidV7(timestamp = Date.now()): string {
  if (!Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > 0xffffffffffff) {
    throw new Error("UUID v7 时间戳超出有效范围");
  }
  const bytes = randomBytes(16);
  let time = timestamp;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

export function generateUlid(timestamp = Date.now()): string {
  if (!Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > 0xffffffffffff) {
    throw new Error("ULID 时间戳超出有效范围");
  }
  let time = timestamp;
  let timePart = "";
  for (let index = 0; index < 10; index += 1) {
    timePart = ULID_ALPHABET[time % 32] + timePart;
    time = Math.floor(time / 32);
  }
  const bytes = randomBytes(10);
  let randomPart = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      randomPart += ULID_ALPHABET[(buffer >> bits) & 31];
      buffer &= (1 << bits) - 1;
    }
  }
  return timePart + randomPart;
}

export function generateToken(length = 32): string {
  if (!Number.isInteger(length) || length < 1 || length > 4096) {
    throw new Error("Token 长度必须在 1 到 4096 之间");
  }
  return Array.from(randomBytes(length), (byte) => TOKEN_ALPHABET[byte & 63]).join("");
}
