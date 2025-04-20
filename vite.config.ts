import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills"; // BufferなどのNode.jsコアモジュールをポリフィル

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // プラグインを追加
      // Buffer をポリフィル対象に含める
      globals: {
        Buffer: true, // Bufferをグローバル変数として利用可能にする
        global: true,
        process: true,
      },
      protocolImports: true, // 'node:' プレフィックスのインポートを許可
    }),
  ],
  optimizeDeps: {
    exclude: ["lucide-react"],
    esbuildOptions: {
      // esbuildの最適化設定
      // Bufferなどのグローバル変数を定義
      define: {
        global: "globalThis", // globalをglobalThisにマッピング
      },
    },
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
