import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/public": {
        target: "https://cloud.istreams-erp.com:4439/iStreamsSmartPublic.asmx",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/public/, ""),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});