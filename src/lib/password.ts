const ITERATIONS = 210_000;
export type PasswordDigest = { salt: string; hash: string; iterations: number };
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(salt), iterations }, key, 256);
  return hex(new Uint8Array(bits));
}
export async function hashPassword(password: string): Promise<PasswordDigest> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: hex(salt), hash: await derive(password, salt, ITERATIONS), iterations: ITERATIONS };
}
export async function verifyPassword(password: string, digest: PasswordDigest) {
  const salt = Uint8Array.from(digest.salt.match(/.{2}/g) ?? [], (byte) => parseInt(byte, 16));
  const actual = await derive(password, salt, digest.iterations);
  let mismatch = actual.length ^ digest.hash.length;
  for (let i = 0; i < actual.length; i++) mismatch |= actual.charCodeAt(i) ^ digest.hash.charCodeAt(i);
  return mismatch === 0;
}