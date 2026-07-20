export const passwordCharsets = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
};

export type PasswordCharset = keyof typeof passwordCharsets;

export function makePassword(length: number, pool: string) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => pool[value % pool.length]).join("");
}

export function generatePasswords(length: number, count: number, pool: string) {
  if (!pool) return [];
  return Array.from({ length: count }, () => makePassword(length, pool));
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  entropyBits: number;
  label: string;
  warnings: string[];
};

export function analyzePasswordStrength(value: string): PasswordStrength {
  let poolSize = 0;
  if (/[a-z]/.test(value)) poolSize += 26;
  if (/[A-Z]/.test(value)) poolSize += 26;
  if (/\d/.test(value)) poolSize += 10;
  if (/[^A-Za-z0-9]/.test(value)) poolSize += 32;
  let entropyBits = value.length > 0 && poolSize > 0 ? value.length * Math.log2(poolSize) : 0;
  const warnings: string[] = [];
  if (value.length < 12) warnings.push("建议至少使用 12 个字符");
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    warnings.push("建议混合大小写字母、数字和符号");
  }
  if (/password|123456|qwerty|admin|letmein/i.test(value)) {
    entropyBits = Math.min(entropyBits, 20);
    warnings.push("包含常见密码或键盘序列");
  }
  if (/(.)\1{2,}/.test(value)) {
    entropyBits *= 0.65;
    warnings.push("包含重复字符");
  }
  const score = (entropyBits < 28 ? 0 : entropyBits < 45 ? 1 : entropyBits < 65 ? 2 : entropyBits < 90 ? 3 : 4) as PasswordStrength["score"];
  return { score, entropyBits: Math.round(entropyBits), label: ["很弱", "较弱", "一般", "较强", "很强"][score], warnings };
}
