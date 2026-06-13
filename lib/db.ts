/**
 * Data layer — all reads/writes go to the consultant PostgreSQL schema
 * via the FastAPI backend. Token is read from localStorage (set by auth.tsx).
 */
import type { Conversation, Message, Profile } from "./types";
import { getToken, setToken } from "./auth";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://maslahatchi.humora.uz";

// ── Base fetch helper ────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...((init?.headers as Record<string, string>) ?? {}),
      },
    });
    if (res.status === 401) { setToken(null); return null; }
    if (!res.ok)            return null;
    if (res.status === 204) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// ── Profile ──────────────────────────────────────────────
export async function getProfile(): Promise<Profile | null> {
  return apiFetch<Profile>("/api/data/profile");
}

export async function saveProfile(profile: Profile): Promise<void> {
  await apiFetch("/api/data/profile", {
    method: "PUT",
    body:   JSON.stringify(profile),
  });
}

// ── Conversations ─────────────────────────────────────────
export async function getConversations(): Promise<Conversation[]> {
  return (await apiFetch<Conversation[]>("/api/data/conversations")) ?? [];
}

export async function saveConversation(conv: Conversation): Promise<void> {
  await apiFetch("/api/data/conversations", {
    method: "POST",
    body:   JSON.stringify(conv),
  });
}

export async function deleteConversation(convId: string): Promise<void> {
  await apiFetch(`/api/data/conversations/${convId}`, { method: "DELETE" });
}

// ── Messages ──────────────────────────────────────────────
export async function getMessages(convId: string): Promise<Message[]> {
  return (await apiFetch<Message[]>(`/api/data/conversations/${convId}/messages`)) ?? [];
}

export async function appendMessage(msg: Message): Promise<void> {
  await apiFetch(`/api/data/conversations/${msg.conversationId}/messages`, {
    method: "POST",
    body:   JSON.stringify(msg),
  });
}

// ── Saved / pinned ────────────────────────────────────────
export async function getSavedIds(): Promise<Set<string>> {
  const ids = await apiFetch<string[]>("/api/data/saved");
  return new Set(ids ?? []);
}

export async function toggleSaved(msgId: string): Promise<Set<string>> {
  const ids = await apiFetch<string[]>(`/api/data/saved/${msgId}`, { method: "POST" });
  return new Set(ids ?? []);
}

// ── Feedback ──────────────────────────────────────────────
export async function submitFeedback(payload: {
  messageId?: string;
  convId?: string;
  rating: 1 | -1;
  comment?: string;
  screenshot?: string;
}): Promise<void> {
  await apiFetch("/api/data/feedback", { method: "POST", body: JSON.stringify(payload) });
}
