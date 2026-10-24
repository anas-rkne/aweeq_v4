import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

const serverOnlyStub = fileURLToPath(
  new URL("./test/stubs/server-only.ts", import.meta.url)
)

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      "server-only": serverOnlyStub,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "medusa/**",
      "e2e/**",
      ".opencode/**",
      ".agents/**",
    ],
    css: false,
    restoreMocks: true,
  },
})
