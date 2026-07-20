import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "https://dev-tools-box.local/" } },
    include: ["tests/ui/**/*.test.tsx"],
  },
});
