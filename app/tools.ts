export const TOOL_IDS = [
  "doc-diff",
  "json-format",
  "json-diff",
  "password",
  "codec",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export type ToolDefinition = {
  id: ToolId;
  label: string;
  description: string;
};

export const DEFAULT_TOOL_ID: ToolId = "doc-diff";

export const tools: ToolDefinition[] = [
  {
    id: "doc-diff",
    label: "文档差异比对",
    description: "逐行比较两段文本，快速定位新增、删除和修改。",
  },
  {
    id: "json-format",
    label: "JSON 格式化",
    description: "解析、校验并输出可读的 JSON 结构。",
  },
  {
    id: "json-diff",
    label: "JSON 差异比对",
    description: "按路径比较 JSON 值，忽略对象键顺序。",
  },
  {
    id: "password",
    label: "随机密码生成",
    description: "生成可复制的强密码，并支持字符集和长度控制。",
  },
  {
    id: "codec",
    label: "信息编解码工具",
    description: "提供 24 种常用编码、解码、摘要和解析方式。",
  },
];

export function isToolId(value: string | null | undefined): value is ToolId {
  return TOOL_IDS.includes(value as ToolId);
}

export function normalizeToolId(value: string | null | undefined): ToolId {
  return isToolId(value) ? value : DEFAULT_TOOL_ID;
}

export function toolboxHref(toolId?: ToolId): string {
  return toolId ? `toolbox.html?tool=${encodeURIComponent(toolId)}` : "toolbox.html";
}
