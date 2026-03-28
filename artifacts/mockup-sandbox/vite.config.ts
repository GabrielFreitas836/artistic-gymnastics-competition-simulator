import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

// Fallbacks para rodar localmente sem precisar configurar .env
const port = Number(process.env.PORT) || 5174; // Porta diferente do simulador principal
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    mockupPreviewPlugin(),
    react(),
    // Removemos o import dinâmico do Cartographer que causava erro local
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    // allowedHosts não é necessário no Vite padrão local, mas mantemos se preferir
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
  },
});