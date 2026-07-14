import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ToolId } from "./tools";

export const toolLoaders: Record<ToolId, LazyExoticComponent<ComponentType>> = {
  "doc-diff": lazy(() => import("./tool-panels/doc-diff-tool")),
  "json-format": lazy(() => import("./tool-panels/json-format-tool")),
  "json-diff": lazy(() => import("./tool-panels/json-diff-tool")),
  password: lazy(() => import("./tool-panels/password-tool")),
  codec: lazy(() => import("./tool-panels/codec-tool")),
  "id-generator": lazy(() => import("./tool-panels/id-generator-tool")),
  "hash-checksum": lazy(() => import("./tool-panels/hash-checksum-tool")),
  "time-cron": lazy(() => import("./tool-panels/time-cron-tool")),
  "regex-tester": lazy(() => import("./tool-panels/regex-tester-tool")),
  "data-converter": lazy(() => import("./tool-panels/data-converter-tool")),
};
