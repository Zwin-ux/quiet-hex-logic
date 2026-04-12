import { getPublicEnv } from "@/lib/runtimeEnv";

export const DEFAULT_WORLD_ID_ACTION = "verify-account";

export function getWorldIdAppId(): string {
  return getPublicEnv("VITE_WORLD_ID_APP_ID");
}

export function getWorldIdAction(): string {
  return getPublicEnv("VITE_WORLD_ID_ACTION") || DEFAULT_WORLD_ID_ACTION;
}

export function getWorldIdConfigurationIssue(): string | null {
  if (!getWorldIdAppId()) {
    return "World ID is not configured for this deployment yet.";
  }

  return null;
}

export function isWorldIdConfigured(): boolean {
  return !getWorldIdConfigurationIssue();
}
