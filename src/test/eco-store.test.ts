import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSession, setSession, signUp, logIn, addScan, deleteScan, clearHistory, deleteAccount, getHistory, stats, BINS, type Scan } from "@/lib/eco-store";

describe("EcoLens browser accounts", () => {
  beforeEach(() => localStorage.clear());
  it("saves registered email/password credentials under the requested key", async () => {
    await signUp("Student", " Student@example.com ", "secret123");
    const stored = localStorage.getItem("ecolens_users") ?? "";
    expect(stored).not.toContain("secret123");
    expect(JSON.parse(stored)[0].digest.hash).toMatch(/^[a-f0-9]{64}$/);
    expect((await logIn("STUDENT@example.com", "secret123")).name).toBe("Student");
  });
  it("blocks unregistered accounts and incorrect passwords", async () => {
    const error = "Account not registered or invalid password. Please sign up first.";
    await expect(logIn("missing@example.com", "secret123")).rejects.toThrow(error);
    await signUp("Student", "student@example.com", "secret123");
    await expect(logIn("student@example.com", "wrong")).rejects.toThrow(error);
    expect(getSession()).toBeNull();
  });
  it("rejects duplicate email registrations", async () => {
    await signUp("Student", "student@example.com", "secret123");
    await expect(signUp("Other", " STUDENT@example.com ", "secret456")).rejects.toThrow("An account with this email already exists.");
  });
  it("does not restore old Google shortcut sessions", async () => {
    const shortcut = { name: "Shortcut", email: "shortcut@example.com", provider: "google", password: null };
    localStorage.setItem("ecolens_registered_users", JSON.stringify([shortcut]));
    localStorage.setItem("ecolens.session", JSON.stringify(shortcut));
    expect(getSession()).toBeNull();
    await expect(logIn(shortcut.email, "anything")).rejects.toThrow("Account not registered or invalid password. Please sign up first.");
  });
  it("clears the active session on logout", async () => {
    setSession(await signUp("Student", "student@example.com", "secret123"));
    setSession(null);
    expect(getSession()).toBeNull();
  });
  it("ignores corrupted accounts, sessions, and history", async () => {
    localStorage.setItem("ecolens_users", "{}");
    localStorage.setItem("ecolens.session", '{"email":42}');
    localStorage.setItem("ecolens_scans_student@example.com", '[{"category":"unknown"}]');
    expect(getSession()).toBeNull();
    expect(getHistory("student@example.com")).toEqual([]);
    await expect(logIn("student@example.com", "secret123")).rejects.toThrow();
    expect((await signUp("Student", "student@example.com", "secret123")).email).toBe("student@example.com");
  });
  it("counts all five statistics and includes e-waste in hazardous", async () => {
    const rows = ["organic", "recyclable", "hazardous", "ewaste", "residual"].map(category => ({ category })) as Scan[];
    expect(stats(rows)).toEqual({ total: 5, organic: 1, recyclable: 1, hazardous: 2, residual: 1 });
  });
  const scan: Scan = { id: "scan-1", image: "data:image/jpeg;base64,YQ==", createdAt: 1793440800000,
    item: "Biscuit wrapper", category: "residual", bin: "Black Bin", confidence: 99, reasoning: "Multilayer wrapper.", steps: ["Place in residual bin."] };
  it("retains user history and all counters after logout and next-day login", async () => {
    const user = await signUp("Student", "student@example.com", "secret123");
    setSession(user);
    addScan(" STUDENT@example.com ", scan);
    expect(JSON.parse(localStorage.getItem("ecolens_scans_student@example.com") ?? "[]")).toEqual([scan]);
    setSession(null);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(scan.createdAt + 86400000));
      setSession(await logIn("student@example.com", "secret123"));
      expect(getHistory(user.email)).toEqual([scan]);
      expect(stats(getHistory(user.email))).toEqual({ total: 1, organic: 0, recyclable: 0, hazardous: 0, residual: 1 });
    } finally { vi.useRealTimers(); }
  });
  it("isolates histories for two registered users", async () => {
    await signUp("A", "a@example.com", "secret123");
    await signUp("B", "b@example.com", "secret456");
    addScan("a@example.com", scan);
    expect(getHistory("b@example.com")).toEqual([]);
    expect(getHistory("a@example.com")).toEqual([scan]);
  });
  it("migrates existing email accounts and history without losing scans", async () => {
    localStorage.setItem("ecolens_registered_users", JSON.stringify([{ name: "Student", email: "student@example.com", password: "secret123", provider: "email" }]));
    localStorage.setItem("ecolens.history.student@example.com", JSON.stringify([scan]));
    expect((await logIn("student@example.com", "secret123")).name).toBe("Student");
    expect(getHistory("student@example.com")).toEqual([scan]);
    expect(localStorage.getItem("ecolens_scans_student@example.com")).toBe(JSON.stringify([scan]));
    expect(localStorage.getItem("ecolens_users")).not.toContain("secret123");
    expect(localStorage.getItem("ecolens_registered_users")).not.toContain("secret123");
  });
  it("never restores legacy history after clearing", () => {
    localStorage.setItem("ecolens.history.student@example.com", JSON.stringify([scan]));
    clearHistory("student@example.com");
    expect(getHistory("student@example.com")).toEqual([]);
  });
  it("never restores legacy history after account deletion and registration", async () => {
    await signUp("Student", "student@example.com", "secret123");
    localStorage.setItem("ecolens.history.student@example.com", JSON.stringify([scan]));
    deleteAccount("student@example.com");
    await signUp("Student", "student@example.com", "secret456");
    expect(getHistory("student@example.com")).toEqual([]);
  });
  it("preserves every old scan when storage is full", async () => {
    addScan("student@example.com", scan);
    const failWrite = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    try { expect(() => addScan("student@example.com", { ...scan, id: "scan-2" })).toThrow("Browser storage is unavailable or full."); }
    finally { failWrite.mockRestore(); }
    expect(getHistory("student@example.com")).toEqual([scan]);
  });
  it.each([["organic", "Green Bin"], ["hazardous", "Red Bin"], ["ewaste", "Red Bin"], ["residual", "Black Bin"]] as const)("maps %s to %s", (category, bin) => {
    expect(BINS[category].bin).toBe(bin);
  });
  it("deletes a single scan and keeps the rest", async () => {
    addScan("student@example.com", scan);
    addScan("student@example.com", { ...scan, id: "scan-2" });
    expect(deleteScan("student@example.com", "scan-1")).toEqual([{ ...scan, id: "scan-2" }]);
    expect(getHistory("student@example.com")).toEqual([{ ...scan, id: "scan-2" }]);
  });
  it("clears all history for one user only", async () => {
    addScan("a@example.com", scan);
    addScan("b@example.com", scan);
    expect(clearHistory("a@example.com")).toEqual([]);
    expect(getHistory("a@example.com")).toEqual([]);
    expect(getHistory("b@example.com")).toEqual([scan]);
  });
  it("deletes an account with its credentials, history and session", async () => {
    const user = await signUp("Student", "student@example.com", "secret123");
    setSession(user);
    addScan("student@example.com", scan);
    deleteAccount("student@example.com");
    expect(getSession()).toBeNull();
    expect(getHistory("student@example.com")).toEqual([]);
    await expect(logIn("student@example.com", "secret123")).rejects.toThrow("Account not registered or invalid password. Please sign up first.");
    expect(JSON.parse(localStorage.getItem("ecolens_users") ?? "[]")).toEqual([]);
  });
});