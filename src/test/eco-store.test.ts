import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSession, setSession, signUp, logIn, addScan, getHistory, stats, BINS, type Scan } from "@/lib/eco-store";

describe("EcoLens browser accounts", () => {
  beforeEach(() => localStorage.clear());
  it("saves registered email/password credentials under the requested key", () => {
    signUp("Student", " Student@example.com ", "secret123");
    expect(JSON.parse(localStorage.getItem("ecolens_users") ?? "[]")).toEqual([
      { name: "Student", email: "student@example.com", password: "secret123", provider: "email" },
    ]);
    expect(logIn("STUDENT@example.com", "secret123").name).toBe("Student");
  });
  it("blocks unregistered accounts and incorrect passwords", () => {
    const error = "Account not found. Please sign up first.";
    expect(() => logIn("missing@example.com", "secret123")).toThrow(error);
    signUp("Student", "student@example.com", "secret123");
    expect(() => logIn("student@example.com", "wrong")).toThrow(error);
    expect(getSession()).toBeNull();
  });
  it("rejects duplicate email registrations", () => {
    signUp("Student", "student@example.com", "secret123");
    expect(() => signUp("Other", " STUDENT@example.com ", "secret456")).toThrow("An account with this email already exists.");
  });
  it("does not restore old Google shortcut sessions", () => {
    const shortcut = { name: "Shortcut", email: "shortcut@example.com", provider: "google", password: null };
    localStorage.setItem("ecolens_registered_users", JSON.stringify([shortcut]));
    localStorage.setItem("ecolens.session", JSON.stringify(shortcut));
    expect(getSession()).toBeNull();
    expect(() => logIn(shortcut.email, "anything")).toThrow("Account not found. Please sign up first.");
  });
  it("clears the active session on logout", () => {
    setSession(signUp("Student", "student@example.com", "secret123"));
    setSession(null);
    expect(getSession()).toBeNull();
  });
  it("ignores corrupted accounts, sessions, and history", () => {
    localStorage.setItem("ecolens_users", "{}");
    localStorage.setItem("ecolens.session", '{"email":42}');
    localStorage.setItem("ecolens_scans_student@example.com", '[{"category":"unknown"}]');
    expect(getSession()).toBeNull();
    expect(getHistory("student@example.com")).toEqual([]);
    expect(() => logIn("student@example.com", "secret123")).toThrow();
    expect(signUp("Student", "student@example.com", "secret123").email).toBe("student@example.com");
  });
  it("counts all five statistics and includes e-waste in hazardous", () => {
    const rows = ["organic", "recyclable", "hazardous", "ewaste", "residual"].map(category => ({ category })) as Scan[];
    expect(stats(rows)).toEqual({ total: 5, organic: 1, recyclable: 1, hazardous: 2, residual: 1 });
  });
  const scan: Scan = { id: "scan-1", image: "data:image/jpeg;base64,YQ==", createdAt: 1793440800000,
    item: "Biscuit wrapper", category: "residual", bin: "Black Bin", confidence: 99, reasoning: "Multilayer wrapper.", steps: ["Place in residual bin."] };
  it("retains user history and all counters after logout and next-day login", () => {
    const user = signUp("Student", "student@example.com", "secret123");
    setSession(user);
    addScan(" STUDENT@example.com ", scan);
    expect(JSON.parse(localStorage.getItem("ecolens_scans_student@example.com") ?? "[]")).toEqual([scan]);
    setSession(null);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(scan.createdAt + 86400000));
      setSession(logIn("student@example.com", "secret123"));
      expect(getHistory(user.email)).toEqual([scan]);
      expect(stats(getHistory(user.email))).toEqual({ total: 1, organic: 0, recyclable: 0, hazardous: 0, residual: 1 });
    } finally { vi.useRealTimers(); }
  });
  it("isolates histories for two registered users", () => {
    signUp("A", "a@example.com", "secret123");
    signUp("B", "b@example.com", "secret456");
    addScan("a@example.com", scan);
    expect(getHistory("b@example.com")).toEqual([]);
    expect(getHistory("a@example.com")).toEqual([scan]);
  });
  it("migrates existing email accounts and history without losing scans", () => {
    localStorage.setItem("ecolens_registered_users", JSON.stringify([{ name: "Student", email: "student@example.com", password: "secret123", provider: "email" }]));
    localStorage.setItem("ecolens.history.student@example.com", JSON.stringify([scan]));
    expect(logIn("student@example.com", "secret123").name).toBe("Student");
    expect(getHistory("student@example.com")).toEqual([scan]);
    expect(localStorage.getItem("ecolens_scans_student@example.com")).toBe(JSON.stringify([scan]));
  });
  it("preserves every old scan when storage is full", () => {
    addScan("student@example.com", scan);
    const failWrite = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    try { expect(() => addScan("student@example.com", { ...scan, id: "scan-2" })).toThrow("Browser storage is unavailable or full."); }
    finally { failWrite.mockRestore(); }
    expect(getHistory("student@example.com")).toEqual([scan]);
  });
  it.each([["organic", "Green Bin"], ["hazardous", "Red Bin"], ["ewaste", "Red Bin"], ["residual", "Black Bin"]] as const)("maps %s to %s", (category, bin) => {
    expect(BINS[category].bin).toBe(bin);
  });
});