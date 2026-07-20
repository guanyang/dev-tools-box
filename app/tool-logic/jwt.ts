export type JwtInspection = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  warnings: string[];
};

export type JwtVerification = {
  valid: boolean;
  algorithm: string;
  message: string;
};

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJsonPart(value: string): Record<string, unknown> {
  const text = new TextDecoder().decode(decodeBase64Url(value));
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JWT 内容必须是 JSON 对象");
  return parsed as Record<string, unknown>;
}

function splitJwt(token: string): [string, string, string] {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) throw new Error("JWT 必须包含 header、payload 和 signature 三段");
  return parts as [string, string, string];
}

export function inspectJwt(token: string, nowSeconds = Math.floor(Date.now() / 1000)): JwtInspection {
  const [encodedHeader, encodedPayload] = splitJwt(token);
  const header = decodeJsonPart(encodedHeader);
  const payload = decodeJsonPart(encodedPayload);
  const warnings: string[] = [];
  if (typeof payload.exp === "number" && payload.exp <= nowSeconds) warnings.push("Token 已过期");
  if (typeof payload.nbf === "number" && payload.nbf > nowSeconds) warnings.push("Token 尚未生效");
  if (typeof payload.iat === "number" && payload.iat > nowSeconds + 60) warnings.push("签发时间晚于当前时间");
  if (!header.alg || header.alg === "none") warnings.push("Token 未声明安全的签名算法");
  return { header, payload, warnings };
}

function algorithmForJwt(algorithm: string): { importAlgorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams; verifyAlgorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams } {
  const hash = `SHA-${algorithm.slice(-3)}`;
  if (/^HS(256|384|512)$/.test(algorithm)) {
    return { importAlgorithm: { name: "HMAC", hash }, verifyAlgorithm: "HMAC" };
  }
  if (/^RS(256|384|512)$/.test(algorithm)) {
    return { importAlgorithm: { name: "RSASSA-PKCS1-v1_5", hash }, verifyAlgorithm: "RSASSA-PKCS1-v1_5" };
  }
  if (/^PS(256|384|512)$/.test(algorithm)) {
    return { importAlgorithm: { name: "RSA-PSS", hash }, verifyAlgorithm: { name: "RSA-PSS", saltLength: Number(algorithm.slice(-3)) / 8 } };
  }
  if (/^ES(256|384|512)$/.test(algorithm)) {
    const namedCurve = algorithm === "ES256" ? "P-256" : algorithm === "ES384" ? "P-384" : "P-521";
    return { importAlgorithm: { name: "ECDSA", namedCurve }, verifyAlgorithm: { name: "ECDSA", hash } };
  }
  throw new Error(`暂不支持 ${algorithm || "未知"} 签名算法`);
}

export async function verifyJwt(token: string, jwk: JsonWebKey): Promise<JwtVerification> {
  const [encodedHeader, encodedPayload, encodedSignature] = splitJwt(token);
  const header = decodeJsonPart(encodedHeader);
  const algorithm = typeof header.alg === "string" ? header.alg : "";
  const { importAlgorithm, verifyAlgorithm } = algorithmForJwt(algorithm);
  const key = await crypto.subtle.importKey("jwk", jwk, importAlgorithm, false, ["verify"]);
  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = decodeBase64Url(encodedSignature);
  const valid = await crypto.subtle.verify(verifyAlgorithm, key, signature.buffer as ArrayBuffer, data);
  return { valid, algorithm, message: valid ? "签名有效" : "签名无效" };
}
