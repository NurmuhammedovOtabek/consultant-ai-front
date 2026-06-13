"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "./types";

const API       = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://maslahatchi.humora.uz";
const TOKEN_KEY = "cai-token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else       localStorage.removeItem(TOKEN_KEY);
}

// ── Context ──────────────────────────────────────────────
interface AuthCtx {
  user:    User | null;
  loading: boolean;
  login(email: string, password: string): Promise<{ error?: string }>;
  signup(email: string, password: string, name: string): Promise<{ error?: string }>;
  logout(): void;
}

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true,
  login:  async () => ({}),
  signup: async () => ({}),
  logout: () => {},
});

// ── Provider ─────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => { if (u) setUser(u); else setToken(null); })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res  = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.detail ?? "Login failed" };
      setToken(data.token);
      setUser(data.user);
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const res  = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.detail ?? "Registration failed" };
      setToken(data.token);
      setUser(data.user);
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  };

  const logout = () => { setToken(null); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
