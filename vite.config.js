import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuración de React para el proyecto StockAI (SB-011)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },
});
