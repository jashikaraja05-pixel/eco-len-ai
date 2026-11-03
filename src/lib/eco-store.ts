import type { ScanResult } from "./classify.functions";
import { z } from "zod";

export type Scan = ScanResult & { id: string; image: string; createdAt: number };
export type User = { email: string; name: string; provider: "email" };

const SESSION = "ecolens.session";
const USERS = "ecolens_users";
const LEGACY_USERS = "ecolens_registered_users";
const histKey = (email: string) => `ecolens_scans_${normalizeEmail(email)}`;
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const userSchema = z.object({ email: z.string().email(), name: z.string().min(1), provider: z.literal("email").default("email") });
const accountSchema = userSchema.extend({ password: z.string().min(6) });
const scanSchema = z.object({
  id: z.string(), image: z.string().startsWith("data:image/"), createdAt: z.number().finite(),
  item: z.string(), category: z.enum(["organic", "recyclable", "hazardous", "ewaste", "residual"]),
  bin: z.string(), confidence: z.number().min(0).max(100), reasoning: z.string(), steps: z.array(z.string()),
});

function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { throw new Error("Browser storage is unavailable or full. Please allow storage and try again."); }
}

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const getSession = (): User | null => {
  const parsed = userSchema.safeParse(read<unknown>(SESSION, null));
  if (!parsed.success) return null;
  const account = accounts().find((u) => normalizeEmail(u.email) === normalizeEmail(parsed.data.email));
  return account ? { email: normalizeEmail(account.email), name: account.name, provider: account.provider ?? "email" } : null;
};
export const setSession = (u: User | null) =>
  u ? write(SESSION, userSchema.parse(u)) : localStorage.removeItem(SESSION);

type Account = z.infer<typeof accountSchema>;
function accounts(): Account[] {
  // Migrate only validated email/password profiles, never old shortcuts.
  const raw = localStorage.getItem(USERS) === null ? read<unknown>(LEGACY_USERS, []) : read<unknown>(USERS, []);
  if (!Array.isArray(raw)) return [];
  const valid = raw.flatMap((entry) => { const parsed = accountSchema.safeParse(entry); return parsed.success ? [{ ...parsed.data, email: normalizeEmail(parsed.data.email) }] : []; });
  if (localStorage.getItem(USERS) === null && valid.length) write(USERS, valid);
  return valid;
}
export function signUp(name: string, email: string, password: string): User {
  const em = normalizeEmail(email);
  if (!z.string().email().safeParse(em).success) throw new Error("Enter a valid email address.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  const users = accounts();
  if (users.some((u) => normalizeEmail(u.email) === em))
    throw new Error("An account with this email already exists.");
  const displayName = name.trim() || em.split("@")[0] || "User";
  users.push({ name: displayName, email: em, password, provider: "email" });
  write(USERS, users);
  return { name: displayName, email: em, provider: "email" };
}
export function logIn(email: string, password: string): User {
  const u = accounts().find((x) => normalizeEmail(x.email) === normalizeEmail(email));
  if (!u || u.password !== password)
    throw new Error("Account not registered or invalid password. Please sign up first.");
  return { name: u.name, email: normalizeEmail(u.email), provider: "email" };
}

export const getHistory = (email: string): Scan[] => {
  const key = histKey(email);
  const legacy = localStorage.getItem(key) === null;
  const raw = read<unknown>(legacy ? `ecolens.history.${normalizeEmail(email)}` : key, []);
  if (!Array.isArray(raw)) return [];
  const valid = raw.flatMap((entry) => { const parsed = scanSchema.safeParse(entry); return parsed.success ? [parsed.data] : []; });
  if (legacy && valid.length) write(key, valid);
  return valid;
};
export function addScan(email: string, scan: Scan): Scan[] {
  const list = [scanSchema.parse(scan), ...getHistory(email)];
  write(histKey(email), list);
  return list;
}
export function deleteScan(email: string, id: string): Scan[] {
  const list = getHistory(email).filter((s) => s.id !== id);
  write(histKey(email), list);
  return list;
}
export function clearHistory(email: string): Scan[] {
  localStorage.removeItem(histKey(email));
  return [];
}
export function deleteAccount(email: string) {
  const em = normalizeEmail(email);
  write(USERS, accounts().filter((u) => normalizeEmail(u.email) !== em));
  localStorage.removeItem(histKey(em));
  localStorage.removeItem(SESSION);
}

export const BINS = {
  organic: { label: "Organic", bin: "Green Bin", tone: "bg-bin-green" },
  recyclable: { label: "Recyclable", bin: "Blue Bin", tone: "bg-bin-blue" },
  hazardous: { label: "Hazardous", bin: "Red Bin", tone: "bg-bin-red" },
  ewaste: { label: "E-Waste", bin: "Red Bin", tone: "bg-bin-red" },
  residual: { label: "Residual", bin: "Black Bin", tone: "bg-bin-black" },
} as const;

export function stats(list: Scan[]) {
  const c = (k: string[]) => list.filter((s) => k.includes(s.category)).length;
  return {
    total: list.length,
    organic: c(["organic"]),
    recyclable: c(["recyclable"]),
    hazardous: c(["hazardous", "ewaste"]),
    residual: c(["residual"]),
  };
}
