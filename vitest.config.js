import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ test: { environment: "node", testTimeout: 60000, hookTimeout: 120000 },
  resolve: { alias: { "@": path.resolve(".") , "server-only": path.resolve("tests/empty.js") } } });
