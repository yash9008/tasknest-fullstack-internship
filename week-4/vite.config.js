import { defineConfig } from "vite";
export default defineConfig({
  root: "client",
  build: { outDir: "../dist", emptyOutDir: true },
  server: {
    host: "127.0.0.1",
    port: Number(process.env.DEV_WEB_PORT || 8034),
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.DEV_API_PORT || 8033}`,
        changeOrigin: false,
      },
    },
  },
});
