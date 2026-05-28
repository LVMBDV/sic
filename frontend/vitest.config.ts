import { defineConfig } from "vitest/config";

// Dedicated test config so Vitest doesn't inherit the widget-as-root build
// setup in vite.config.ts. The widget helpers under test are pure, so the
// default node environment is enough — no DOM needed.
export default defineConfig({
  test: {
    environment: "node",
    include: ["widget/**/*.test.ts", "embed/**/*.test.ts"],
  },
});
