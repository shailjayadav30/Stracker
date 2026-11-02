import { defineConfig } from "vitest/config";

// Unit tests for pure logic (no database, no API keys). Tests live in tests/, outside
// src/, so the production build (tsc, rootDir src) never compiles them.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
