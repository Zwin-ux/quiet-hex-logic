const DEFAULT_POST_AUTH_PATH = "/worlds";

function sanitizeReturnPath(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (/^\/auth(?:[/?#]|$)/.test(trimmed)) return null;
  return trimmed;
}

export function getCurrentAppPath(): string | null {
  if (typeof window === "undefined") return null;
  return sanitizeReturnPath(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

export function buildAuthRoute(returnTo?: string | null): string {
  const url = new URL("/auth", typeof window !== "undefined" ? window.location.origin : "http://localhost");
  const safeReturnTo = sanitizeReturnPath(returnTo) ?? getCurrentAppPath();

  if (safeReturnTo && safeReturnTo !== DEFAULT_POST_AUTH_PATH) {
    url.searchParams.set("next", safeReturnTo);
  }

  return `${url.pathname}${url.search}`;
}

export function buildAuthRedirectUrl(returnTo?: string | null): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  return new URL(buildAuthRoute(returnTo), origin).toString();
}

export function buildPasswordResetRedirectUrl(returnTo?: string | null): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL("/auth", origin);
  url.searchParams.set("reset", "true");

  const safeReturnTo = sanitizeReturnPath(returnTo) ?? getCurrentAppPath();
  if (safeReturnTo && safeReturnTo !== DEFAULT_POST_AUTH_PATH) {
    url.searchParams.set("next", safeReturnTo);
  }

  return url.toString();
}

export function resolvePostAuthPath(returnTo?: string | null): string {
  return sanitizeReturnPath(returnTo) ?? DEFAULT_POST_AUTH_PATH;
}
