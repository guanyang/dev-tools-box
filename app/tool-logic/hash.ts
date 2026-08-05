import { md5, sha1 } from "@noble/hashes/legacy.js";
import { sha256, sha384, sha512 } from "@noble/hashes/sha2.js";

export type HashAlgorithm = "MD5" | "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(view, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashBytes(
  input: BufferSource,
  algorithm: HashAlgorithm,
): Promise<string> {
  const bytes = ArrayBuffer.isView(input)
    ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
    : new Uint8Array(input);
  switch (algorithm) {
    case "MD5": return bytesToHex(md5(bytes));
    case "SHA-1": return bytesToHex(sha1(bytes));
    case "SHA-256": return bytesToHex(sha256(bytes));
    case "SHA-384": return bytesToHex(sha384(bytes));
    case "SHA-512": return bytesToHex(sha512(bytes));
  }
}

export async function hashText(input: string, algorithm: HashAlgorithm): Promise<string> {
  return hashBytes(new TextEncoder().encode(input), algorithm);
}

export async function hashBlob(input: Blob, algorithm: HashAlgorithm): Promise<string> {
  const hasher = (() => {
    switch (algorithm) {
      case "MD5": return md5.create();
      case "SHA-1": return sha1.create();
      case "SHA-256": return sha256.create();
      case "SHA-384": return sha384.create();
      case "SHA-512": return sha512.create();
    }
  })();
  const reader = input.stream().getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      hasher.update(value);
    }
    return bytesToHex(hasher.digest());
  } finally {
    reader.releaseLock();
  }
}

export async function hmacText(
  input: string,
  secret: string,
  algorithm: HashAlgorithm,
): Promise<string> {
  if (algorithm === "MD5") throw new Error("HMAC 不支持 MD5，请选择 SHA-1、SHA-256、SHA-384 或 SHA-512");
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  return bytesToHex(
    await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(input)),
  );
}
