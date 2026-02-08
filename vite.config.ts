import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'https://ptuxqfwicdpdslqwnswd.supabase.co/functions/v1',
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
