import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // /api/multi는 멀티 서버(SolveRoom_Multi, 8081, 웹소켓 포함), 나머지 /api는 Spring 서버(SolveRoom, 8080).
    // 앞에 둔 규칙부터 맞춰 보므로 /api/multi를 먼저 둔다
    proxy: {
      "/api/multi": { target: "http://localhost:8081", ws: true },
      "/api": "http://localhost:8080",
    },
  },
});
