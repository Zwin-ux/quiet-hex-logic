import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    // Used by /debug to help confirm you are on the latest deployment (not a cached JS bundle).
    __HEXLOGY_BUILD_ID__: JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.VERCEL_DEPLOYMENT_ID ||
        process.env.GITHUB_SHA ||
        process.env.COMMIT_SHA ||
        new Date().toISOString()
    ),
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'https://kgwxaenxdlzuzqyoewpe.supabase.co/functions/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // OnchainKit deep-imports `wagmi/connectors` but `baseAccount` lives in `@wagmi/connectors`.
      // This alias keeps OnchainKit compatible with our wagmi version.
      "wagmi/connectors": "@wagmi/connectors",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'chess-engine': ['chess.js'],
          'charts': ['recharts'],
          'web3': ['wagmi', 'viem', '@coinbase/onchainkit'],
          'worldid': ['@worldcoin/idkit'],
        },
      },
    },
  },
}));
