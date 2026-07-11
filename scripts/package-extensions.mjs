import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const browsers = ["chrome", "edge", "firefox"];
const { version } = JSON.parse(readFileSync("package.json", "utf8"));
mkdirSync("artifacts", { recursive: true });

for (const browser of browsers) {
  const archive = resolve(`artifacts/dev-tools-box-${browser}-${version}.zip`);
  rmSync(archive, { force: true });
  execFileSync("zip", ["-qr", archive, "."], {
    cwd: resolve(`dist-extension/${browser}`),
    stdio: "inherit",
  });
}
