import { beforeEach, describe, expect, it } from "vitest";
import { getSession, setSession, signUp, logIn, googleLogin, getHistory, stats, type Scan } from "@/lib/eco-store";

describe("EcoLens browser accounts", () => {
  beforeEach(() => localStorage.clear());
  it("saves registered email/password credentials under the requested key", () => {
    signUp("Student", " Student@example.com ", "secret123");
    expect(JSON.parse(localStorage.getItem("ecolens_registered_users") ?? "[]")).toEqual([
      { name: "Student", email: "student@example.com", password: "secret123", provider: "email" },
    ]);
    expect(logIn("STUDENT@example.com", "secret123").name).toBe("Student");
  });
  it("blocks unregistered accounts and incorrect passwords", () => {
    const error = "Account not registered or invalid password. Please sign up first.";
    expect(() => logIn("missing@example.com", "secret123")).toThrow(error);
    signUp("Student", "student@example.com", "secret123");
    expect(() => logIn("student@example.com", "wrong")).toThrow(error);
    expect(getSession()).toBeNull();
  });
  it("rejects duplicate email registrations", () => {
    signUp("Student", "student@example.com", "secret123");
    expect(() => signUp("Other", " STUDENT@example.com ", "secret456")).toThrow("An account with this email already exists.");
  });
  it("directly selects only the primary Google shortcut account", () => {
    const user = googleLogin();
    expect(user.email).toBe("jashika.student@gmail.com");
    expect(user.name).toBe("Jashika Rajasekaran");
    setSession(user);
    expect(getSession()).toEqual(user);
    googleLogin();
    expect(JSON.parse(localStorage.getItem("ecolens_registered_users") ?? "[]")).toHaveLength(1);
    expect(() => logIn(user.email, "anything")).toThrow();
  });
  it("clears the active session on logout", () => {
    setSession(googleLogin());
    setSession(null);
    expect(getSession()).toBeNull();
  });
  it("ignores corrupted accounts, sessions, and history", () => {
    localStorage.setItem("ecolens_registered_users", "{}");
    localStorage.setItem("ecolens.session", '{"email":42}');
    localStorage.setItem("ecolens.history.student@example.com", '[{"category":"unknown"}]');
    expect(getSession()).toBeNull();
    expect(getHistory("student@example.com")).toEqual([]);
    expect(() => logIn("student@example.com", "secret123")).toThrow();
    expect(googleLogin().email).toBe("jashika.student@gmail.com");
  });
  it("counts all five statistics and includes e-waste in hazardous", () => {
    const rows = ["organic", "recyclable", "hazardous", "ewaste", "residual"].map(category => ({ category })) as Scan[];
    expect(stats(rows)).toEqual({ total: 5, organic: 1, recyclable: 1, hazardous: 2, residual: 1 });
  });
});