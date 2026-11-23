import { defineConfig } from "vitest/config";

// Config própria do servidor: sem ela o Vitest sobe até o vite.config.ts da raiz,
// que depende do node_modules do frontend (ausente no job "Servidor" do CI).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
