import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Nota: Removidos plugins específicos do Replit para compatibilidade local
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      // Isso resolve o erro de não encontrar o "@/" nos imports
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true, // Permite acessar via IP na rede local se precisar
  },
});