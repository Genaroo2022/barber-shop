const TOKEN_KEY = "sbp_access_token";

const readStorage = (kind: "session" | "local"): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
};

export function getAccessToken(): string | null {
  const session = readStorage("session");
  const local = readStorage("local");
  // Legacy cleanup: token should live only in sessionStorage.
  const legacyLocalToken = local?.getItem(TOKEN_KEY);
  if (legacyLocalToken) {
    local?.removeItem(TOKEN_KEY);
  }
  return session?.getItem(TOKEN_KEY) ?? null;
}

export function setAccessToken(token: string): void {
  readStorage("session")?.setItem(TOKEN_KEY, token);
  // Keep localStorage clean to avoid persisted auth between browser sessions.
  readStorage("local")?.removeItem(TOKEN_KEY);
}

export function clearAccessToken(): void {
  readStorage("session")?.removeItem(TOKEN_KEY);
  readStorage("local")?.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
