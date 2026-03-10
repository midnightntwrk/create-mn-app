import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: "./src",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["utils/**/*.ts", "installers/**/*.ts"],
    },
  },
});
