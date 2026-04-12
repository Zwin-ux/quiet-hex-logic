/// <reference types="vite/client" />

declare const __HEXLOGY_BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DISCORD_CLIENT_ID?: string;
  readonly VITE_ENABLE_BASE_WALLET?: string;
  readonly VITE_ONCHAINKIT_API_KEY?: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_WORLD_ID_ACTION?: string;
  readonly VITE_WORLD_ID_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __HEXLOGY_RUNTIME_ENV__?: Partial<Record<keyof ImportMetaEnv, string>>;
}
