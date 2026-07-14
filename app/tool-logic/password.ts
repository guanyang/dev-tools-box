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
