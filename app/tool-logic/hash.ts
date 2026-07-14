import { sha256, sha512 } from "@noble/hashes/sha2.js";

export type HashAlgorithm = "SHA-256" | "SHA-512";

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(view, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashBytes(
  input: BufferSource,
  algorithm: HashAlgorithm,
): Promise<string> {
  return bytesToHex(await globalThis.crypto.subtle.digest(algorithm, input));
}

export async function hashText(input: string, algorithm: HashAlgorithm): Promise<string> {
  return hashBytes(new TextEncoder().encode(input), algorithm);
}

export async function hashBlob(input: Blob, algorithm: HashAlgorithm): Promise<string> {
  const hasher = (algorithm === "SHA-256" ? sha256 : sha512).create();
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
