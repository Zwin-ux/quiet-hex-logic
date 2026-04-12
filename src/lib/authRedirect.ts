import { getPublicEnv } from "@/lib/runtimeEnv";

const DEFAULT_POST_AUTH_PATH = "/worlds";
const AUTH_TRANSIENT_KEYS = ["code", "type", "error", "error_code", "error_description"] as const;

export type AuthCallbackNotice = {
  tone: "normal" | "warning" | "critical";
  title: string;
  description: string;
};

export type ParsedAuthUrlState = {
  returnTo: string;
  isResetFlow: boolean;
  authError: string | null;
  authType: string | null;
  hasCode: boolean;
  cleanedSearch: string;
  shouldClearHash: boolean;
  notice: AuthCallbackNotice | null;
};

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

function getAuthOrigin(): string {
  const canonicalOrigin = getPublicEnv("VITE_PUBLIC_APP_URL");
  if (canonicalOrigin) {
    try {
      return new URL(canonicalOrigin).origin;
    } catch {
      // Ignore malformed env and fall back to runtime origin.
    }
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost";
}

export function buildAuthRoute(returnTo?: string | null): string {
  const url = new URL("/auth", getAuthOrigin());
  const safeReturnTo = sanitizeReturnPath(returnTo) ?? getCurrentAppPath();

  if (safeReturnTo && safeReturnTo !== DEFAULT_POST_AUTH_PATH) {
    url.searchParams.set("next", safeReturnTo);
  }

  return `${url.pathname}${url.search}`;
}

export function buildAuthRedirectUrl(returnTo?: string | null): string {
  const origin = getAuthOrigin();
  return new URL(buildAuthRoute(returnTo), origin).toString();
}

export function buildPasswordResetRedirectUrl(returnTo?: string | null): string {
  const origin = getAuthOrigin();
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

function createParams(input: string | null | undefined): URLSearchParams {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return new URLSearchParams();
  const normalized = raw.startsWith("?") || raw.startsWith("#") ? raw.slice(1) : raw;
  return new URLSearchParams(normalized);
}

function pickParam(searchParams: URLSearchParams, hashParams: URLSearchParams, key: string): string | null {
  return searchParams.get(key) ?? hashParams.get(key);
}

function buildAuthNotice(
  authError: string | null,
  authType: string | null,
  hasCode: boolean,
  isResetFlow: boolean,
): AuthCallbackNotice | null {
  if (authError) {
    return {
      tone: "critical",
      title: "Auth flow failed",
      description: authError,
    };
  }

  if (isResetFlow) {
    return {
      tone: "warning",
      title: "Reset your password",
      description: "Set a new password to finish recovering your BOARD identity.",
    };
  }

  if (authType === "signup") {
    return {
      tone: "normal",
      title: "Email confirmed",
      description: "Finish signing in to enter BOARD.",
    };
  }

  if (authType === "magiclink" || authType === "invite") {
    return {
      tone: "normal",
      title: "Sign-in link accepted",
      description: "Finishing your BOARD session now.",
    };
  }

  if (hasCode) {
    return {
      tone: "normal",
      title: "Completing sign-in",
      description: "BOARD is exchanging your provider session now.",
    };
  }

  return null;
}

export function parseAuthUrlState(search?: string | null, hash?: string | null): ParsedAuthUrlState {
  const searchParams = createParams(search);
  const hashParams = createParams(hash);
  const returnTo = resolvePostAuthPath(pickParam(searchParams, hashParams, "next"));
  const authError = pickParam(searchParams, hashParams, "error_description")
    ?? pickParam(searchParams, hashParams, "error");
  const authType = pickParam(searchParams, hashParams, "type");
  const hasCode = Boolean(pickParam(searchParams, hashParams, "code"));
  const isResetFlow = searchParams.get("reset") === "true" || authType === "recovery";

  const cleaned = new URLSearchParams(searchParams);
  for (const key of AUTH_TRANSIENT_KEYS) {
    cleaned.delete(key);
  }

  const cleanedSearch = cleaned.toString() ? `?${cleaned.toString()}` : "";

  return {
    returnTo,
    isResetFlow,
    authError,
    authType,
    hasCode,
    cleanedSearch,
    shouldClearHash:
      hashParams.has("error")
      || hashParams.has("error_description")
      || (
        hashParams.toString().length > 0
        && !hashParams.has("access_token")
        && !hashParams.has("refresh_token")
      ),
    notice: buildAuthNotice(authError, authType, hasCode, isResetFlow),
  };
}
