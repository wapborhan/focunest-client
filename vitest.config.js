import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: { environment: "node", testTimeout: 60000, hookTimeout: 120000 },
  resolve: { alias: { "@": path.resolve("."), "server-only": path.resolve("tests/empty.js") } },
});
