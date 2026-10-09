import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Spring 서버(SolveRoom) 연결 시 사용. 현재는 목 데이터만 사용한다.
    proxy: { "/api": "http://localhost:8080" },
  },
});
