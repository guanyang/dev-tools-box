import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const browsers = ["chrome", "edge", "firefox"];
const entryBudgets = { "popup.html": 70, "toolbox.html": 80 };
const dynamicChunkBudget = 190;

function kib(bytes) {
  return bytes / 1024;
}

for (const browser of browsers) {
  const root = new URL(`../dist-extension/${browser}/`, import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("bundle-manifest.json", root), "utf8"));
  const gzipSizes = new Map();

  async function gzipSize(file) {
    if (!gzipSizes.has(file)) gzipSizes.set(file, gzipSync(await readFile(new URL(file, root))).byteLength);
    return gzipSizes.get(file);
  }

  async function entrySize(key, visited = new Set()) {
    if (visited.has(key)) return 0;
    visited.add(key);
    const chunk = manifest[key];
    let total = await gzipSize(chunk.file);
    for (const css of chunk.css ?? []) total += await gzipSize(css);
    for (const imported of chunk.imports ?? []) total += await entrySize(imported, visited);
    return total;
  }

  for (const [entry, budget] of Object.entries(entryBudgets)) {
    const size = kib(await entrySize(entry));
    if (size > budget) throw new Error(`${browser} ${entry} initial bundle ${size.toFixed(1)} KiB exceeds ${budget} KiB`);
    console.log(`${browser} ${entry}: ${size.toFixed(1)} KiB gzip / ${budget} KiB`);
  }

  for (const chunk of Object.values(manifest).filter((item) => item.isDynamicEntry)) {
    const size = kib(await gzipSize(chunk.file));
    if (size > dynamicChunkBudget) throw new Error(`${browser} ${chunk.name} chunk ${size.toFixed(1)} KiB exceeds ${dynamicChunkBudget} KiB`);
  }
}
