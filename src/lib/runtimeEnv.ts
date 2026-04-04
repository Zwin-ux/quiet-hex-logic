const PUBLIC_ENV_KEYS = [
  'VITE_API_BASE_URL',
  'VITE_DISCORD_CLIENT_ID',
  'VITE_ENABLE_BASE_WALLET',
  'VITE_ONCHAINKIT_API_KEY',
  'VITE_SUPABASE_PROJECT_ID',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_WORLD_ID_APP_ID',
] as const;

type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number];
type RuntimeEnvMap = Partial<Record<PublicEnvKey, string>>;

function normalizeValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readRuntimeValue(key: PublicEnvKey): string {
  if (typeof window !== 'undefined') {
    const runtimeValue = window.__HEXLOGY_RUNTIME_ENV__?.[key];
    if (typeof runtimeValue === 'string' && runtimeValue.trim()) {
      return runtimeValue.trim();
    }
  }

  return normalizeValue(import.meta.env[key]);
}

export function getPublicEnv(key: PublicEnvKey): string {
  return readRuntimeValue(key);
}

export function getPublicEnvMap(): RuntimeEnvMap {
  return Object.fromEntries(PUBLIC_ENV_KEYS.map((key) => [key, readRuntimeValue(key)])) as RuntimeEnvMap;
}

export function getBooleanPublicEnv(key: Extract<PublicEnvKey, 'VITE_ENABLE_BASE_WALLET'>): boolean {
  return getPublicEnv(key).toLowerCase() === 'true';
}
