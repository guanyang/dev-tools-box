import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ToolId } from "./tools";

type ToolModule = { default: ComponentType };

export const toolImports: Record<ToolId, () => Promise<ToolModule>> = {
  "doc-diff": () => import("./tool-panels/doc-diff-tool"),
  "json-format": () => import("./tool-panels/json-format-tool"),
  "json-diff": () => import("./tool-panels/json-diff-tool"),
  password: () => import("./tool-panels/password-tool"),
  codec: () => import("./tool-panels/codec-tool"),
  "id-generator": () => import("./tool-panels/id-generator-tool"),
  "hash-checksum": () => import("./tool-panels/hash-checksum-tool"),
  "time-cron": () => import("./tool-panels/time-cron-tool"),
  "regex-tester": () => import("./tool-panels/regex-tester-tool"),
  "data-converter": () => import("./tool-panels/data-converter-tool"),
  "jwt-inspector": () => import("./tool-panels/jwt-inspector-tool"),
  "qr-generator": () => import("./tool-panels/qr-generator-tool"),
};

export const toolLoaders = Object.fromEntries(
  Object.entries(toolImports).map(([toolId, loader]) => [toolId, lazy(loader)]),
) as Record<ToolId, LazyExoticComponent<ComponentType>>;

export async function preloadToolModules() {
  await Promise.allSettled(Object.values(toolImports).map((load) => load()));
}
