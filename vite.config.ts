import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    strictPort: true,
    port: 8787,
  },
  plugins: [
    react(), 
    cloudflare({
      configPath: "wrangler.toml",
    }),
    tailwindcss(), 
  ],
  worker: {
    format: "es",
  },
  optimizeDeps: {
    force: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./view/src"),
    },
  },

  define: {
		// Ensure proper module definitions for Cloudflare Workers context
		'process.env.NODE_ENV': JSON.stringify(
			process.env.NODE_ENV || 'development',
		),
		global: 'globalThis',
		// '__filename': '""',
		// '__dirname': '""',
	},

  // Clear cache more aggressively
  cacheDir: 'node_modules/.vite',

  build: {
    sourcemap: true,
  }
});
