import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => {
  const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || "http://localhost:8080";
  const envAllowedHosts = (process.env.VITE_DEV_ALLOWED_HOSTS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedHosts = Array.from(new Set(["localhost", "127.0.0.1", ...envAllowedHosts]));

  return {
    server: {
      host: "::",
      port: 5173,
      allowedHosts,
      proxy: {
        "/api": {
          target: devProxyTarget,
          changeOrigin: true,
        },
      },
      hmr: {
        overlay: false,
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
