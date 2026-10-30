import type { ScanResult } from "./classify.functions";

export type Scan = ScanResult & { id: string; image: string; createdAt: number };
export type User = { email: string; name: string; provider: "email" | "google" };

const SESSION = "ecolens.session";
const USERS = "ecolens_registered_users";
const histKey = (email: string) => `ecolens.history.${email.toLowerCase()}`;

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const getSession = () => read<User | null>(SESSION, null);
export const setSession = (u: User | null) =>
  u ? localStorage.setItem(SESSION, JSON.stringify(u)) : localStorage.removeItem(SESSION);

type Account = { email: string; name: string; password: string | null; provider?: "email" | "google" };
export function signUp(name: string, email: string, password: string): User {
  const users = read<Account[]>(USERS, []);
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
    throw new Error("An account with this email already exists.");
  users.push({ name, email: email.toLowerCase(), password, provider: "email" });
  localStorage.setItem(USERS, JSON.stringify(users));
  return { name, email, provider: "email" };
}
export function logIn(email: string, password: string): User {
  const u = read<Account[]>(USERS, []).find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u || u.password === null || u.password !== password)
    throw new Error("Account not registered or invalid password. Please sign up first.");
  return { name: u.name, email: u.email, provider: "email" };
}

export function googleLogin(name: string, email: string): User {
  const users = read<Account[]>(USERS, []);
  const em = email.toLowerCase();
  const existing = users.find((x) => x.email.toLowerCase() === em);
  if (!existing) {
    users.push({ name, email: em, password: null, provider: "google" });
    localStorage.setItem(USERS, JSON.stringify(users));
  }
  return { name: existing?.name ?? name, email: em, provider: "google" };
}

export const getHistory = (email: string) => read<Scan[]>(histKey(email), []);
export function addScan(email: string, scan: Scan): Scan[] {
  let list = [scan, ...getHistory(email)];
  // keep within localStorage quota by trimming the oldest scans
  while (list.length) {
    try {
      localStorage.setItem(histKey(email), JSON.stringify(list));
      return list;
    } catch {
      list = list.slice(0, -1);
    }
  }
  return list;
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
