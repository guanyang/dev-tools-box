export const TOOL_IDS = [
  "doc-diff",
  "json-format",
  "json-diff",
  "password",
  "codec",
  "id-generator",
  "hash-checksum",
  "time-cron",
  "regex-tester",
  "data-converter",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export const TOOL_CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "text", label: "文本" },
  { id: "data", label: "数据" },
  { id: "security", label: "安全" },
  { id: "generate", label: "生成" },
  { id: "time", label: "时间" },
] as const;

export type ToolCategory = Exclude<(typeof TOOL_CATEGORIES)[number]["id"], "all">;
export type ToolCategoryFilter = (typeof TOOL_CATEGORIES)[number]["id"];
export type ToolIconName =
  | "file-diff"
  | "braces"
  | "git-compare"
  | "key"
  | "binary"
  | "fingerprint"
  | "hash"
  | "calendar-clock"
  | "regex"
  | "refresh";

export type ToolDefinition = {
  id: ToolId;
  label: string;
  description: string;
  category: ToolCategory;
  keywords: readonly string[];
  icon: ToolIconName;
};

export const DEFAULT_TOOL_ID: ToolId = "doc-diff";

export const tools: ToolDefinition[] = [
  {
    id: "doc-diff",
    label: "文档差异比对",
    description: "逐行比较两段文本，快速定位新增、删除和修改。",
    category: "text",
    keywords: ["diff", "compare", "text", "文档", "文本"],
    icon: "file-diff",
  },
  {
    id: "json-format",
    label: "JSON 格式化",
    description: "解析、校验并输出可读的 JSON 结构。",
    category: "data",
    keywords: ["json", "format", "minify", "格式化", "压缩"],
    icon: "braces",
  },
  {
    id: "json-diff",
    label: "JSON 差异比对",
    description: "按路径比较 JSON 值，忽略对象键顺序。",
    category: "data",
    keywords: ["json", "diff", "compare", "合并", "差异"],
    icon: "git-compare",
  },
  {
    id: "password",
    label: "随机密码生成",
    description: "生成可复制的强密码，并支持字符集和长度控制。",
    category: "generate",
    keywords: ["password", "random", "密码", "随机"],
    icon: "key",
  },
  {
    id: "codec",
    label: "信息编解码工具",
    description: "提供 24 种常用编码、解码、摘要和解析方式。",
    category: "data",
    keywords: ["base64", "url", "jwt", "gzip", "encode", "decode", "编解码"],
    icon: "binary",
  },
  {
    id: "id-generator",
    label: "ID 与 Token 生成",
    description: "批量生成 UUID v4/v7、ULID 和安全随机 Token。",
    category: "generate",
    keywords: ["uuid", "ulid", "token", "id", "标识符"],
    icon: "fingerprint",
  },
  {
    id: "hash-checksum",
    label: "哈希与文件校验",
    description: "计算文本或文件的 SHA-256、SHA-512 与 HMAC。",
    category: "security",
    keywords: ["hash", "sha256", "sha512", "hmac", "checksum", "文件校验"],
    icon: "hash",
  },
  {
    id: "time-cron",
    label: "时间与 Cron",
    description: "转换 Unix 时间戳、时区，并计算 Cron 后续时间。",
    category: "time",
    keywords: ["timestamp", "timezone", "cron", "unix", "时间戳", "时区"],
    icon: "calendar-clock",
  },
  {
    id: "regex-tester",
    label: "正则表达式测试",
    description: "实时查看匹配、捕获组和替换结果。",
    category: "text",
    keywords: ["regex", "regexp", "replace", "match", "正则", "替换"],
    icon: "regex",
  },
  {
    id: "data-converter",
    label: "JSON/YAML 与 JSONPath",
    description: "在 JSON 与 YAML 间转换，并查询 JSONPath。",
    category: "data",
    keywords: ["json", "yaml", "jsonpath", "convert", "query", "转换", "查询"],
    icon: "refresh",
  },
];

export function isToolId(value: string | null | undefined): value is ToolId {
  return TOOL_IDS.includes(value as ToolId);
}

export function normalizeToolId(value: string | null | undefined): ToolId {
  return isToolId(value) ? value : DEFAULT_TOOL_ID;
}

export function filterTools(
  definitions: readonly ToolDefinition[],
  query: string,
  category: ToolCategoryFilter = "all",
): ToolDefinition[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return definitions.filter((tool) => {
    if (category !== "all" && tool.category !== category) return false;
    if (!normalizedQuery) return true;
    return [tool.label, tool.description, ...tool.keywords]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });
}

export function toolboxHref(toolId?: ToolId): string {
  return toolId ? `toolbox.html?tool=${encodeURIComponent(toolId)}` : "toolbox.html";
}
