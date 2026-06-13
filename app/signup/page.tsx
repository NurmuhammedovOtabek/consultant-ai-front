"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

function GemIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 28 28" fill="currentColor">
      <path d="M14 2.5L5 9.5 2 14l12 11.5L26 14l-3-4.5L14 2.5z" opacity="0.3" />
      <path d="M14 2.5l9 7-9 13.5L5 9.5l9-7z" opacity="0.6" />
      <path d="M14 2.5L5 9.5h18L14 2.5z" />
    </svg>
  );
}

export default function SignupPage() {
  const { user, loading, signup } = useAuth();
  const router = useRouter();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/onboarding");
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }
    setBusy(true);
    setError("");
    const { error: err } = await signup(email.trim(), password, name.trim());
    if (err) { setError(err); setBusy(false); return; }
    router.replace("/onboarding");
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
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Your business companion starts here.</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Full name</label>
            <input
              className="auth-input"
              type="text"
              placeholder="Otabek Toshmatov"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Confirm password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            className="auth-btn"
            type="submit"
            disabled={busy || !name || !email || !password || !confirm}
          >
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          Already have an account?{" "}
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
