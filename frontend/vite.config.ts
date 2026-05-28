import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

// Dev: serve widget/ as root, so `/` shows the iframe widget.
// Build: emit a hashed widget bundle + a fixed-name embed.js loader.
export default defineConfig({
  root: resolve(root, "widget"),
  publicDir: false,
  build: {
    outDir: resolve(root, "dist"),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        widget: resolve(root, "widget/index.html"),
        embed: resolve(root, "embed/embed.ts"),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "embed" ? "embed.js" : "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:6767",
      "/auth": "http://127.0.0.1:6767",
    },
  },
});
