import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  server: {
    proxy: {
      // APIリクエストをComfyUIサーバーに転送する設定
      "/system_stats": {
        target: "http://127.0.0.1:8188",
        changeOrigin: true,
      },
      "/prompt": {
        target: "http://127.0.0.1:8188",
        changeOrigin: true,
      },
      "/upload/image": {
        target: "http://127.0.0.1:8188",
        changeOrigin: true,
      },
      "/history": {
        target: "http://127.0.0.1:8188",
        changeOrigin: true,
      },
      "/view": {
        target: "http://127.0.0.1:8188",
        changeOrigin: true,
      },
      // WebSocket接続もプロキシする必要がある
      "/ws": {
        target: "ws://127.0.0.1:8188", // WebSocketの場合はws://
        ws: true, // WebSocketプロキシを有効にする
        changeOrigin: true,
      },
    },
  },
});
