import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const browsers = ["chrome", "edge", "firefox"];
rmSync("dist-extension", { force: true, recursive: true });

for (const browser of browsers) {
  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["exec", "--", "vite", "build", "--config", "vite.extension.config.ts"],
    {
      env: { ...process.env, EXTENSION_BROWSER: browser },
      stdio: "inherit",
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
