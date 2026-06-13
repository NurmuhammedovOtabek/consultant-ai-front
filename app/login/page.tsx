"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getProfile } from "@/lib/db";

function GemIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 28 28" fill="currentColor">
      <path d="M14 2.5L5 9.5 2 14l12 11.5L26 14l-3-4.5L14 2.5z" opacity="0.3" />
      <path d="M14 2.5l9 7-9 13.5L5 9.5l9-7z" opacity="0.6" />
      <path d="M14 2.5L5 9.5h18L14 2.5z" />
    </svg>
  );
}

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  useEffect(() => {
    if (!loading && user) {
      getProfile().then((profile) => {
        router.replace(profile?.completedOnboarding ? "/chat" : "/onboarding");
      });
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setBusy(true);
    setError("");
    const { error: err } = await login(email.trim(), password);
    if (err) { setError(err); setBusy(false); return; }
    const profile = await getProfile();
    router.replace(profile?.completedOnboarding ? "/chat" : "/onboarding");
  };

  if (loading) return null;

  return (
    <div className="auth-page">
      <div className="auth-glow" />

      <div className="auth-card">
        {/* Logo */}
        <Link href="/" className="auth-logo">
          <div className="auth-logo-icon"><GemIcon /></div>
          <span className="auth-logo-name">Consultant <span>AI</span></span>
        </Link>

        {/* Heading */}
        <div className="auth-heading">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to continue your business journey.</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Email address</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-btn" type="submit" disabled={busy || !email || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Guest */}
        <div className="auth-guest">
          <Link href="/chat">Continue as guest →</Link>
        </div>

        {/* Footer */}
        <div className="auth-footer">
          Don&apos;t have an account?{" "}
          <Link href="/signup">Create one</Link>
        </div>
      </div>
    </div>
  );
}
