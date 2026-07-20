export type DetectedInputKind = "json" | "yaml" | "xml" | "toml" | "csv" | "jwt" | "url" | "base64" | "text";

export type DetectionSuggestion = {
  kind: DetectedInputKind;
  confidence: number;
  toolId: "json-format" | "data-converter" | "jwt-inspector" | "codec";
  label: string;
};

export type DetectionResult = {
  status: "detected" | "unknown" | "too-large" | "cancelled" | "timed-out";
  byteLength: number;
  suggestions: DetectionSuggestion[];
};

export type DetectionOptions = {
  maxBytes?: number;
  deadlineMs?: number;
  signal?: AbortSignal;
  now?: () => number;
};

const DEFAULT_MAX_BYTES = 1024 * 1024;
const DEFAULT_DEADLINE_MS = 40;

function suggestion(
  kind: DetectedInputKind,
  confidence: number,
  toolId: DetectionSuggestion["toolId"],
  label: string,
): DetectionSuggestion {
  return { kind, confidence, toolId, label };
}

export function detectInput(input: string, options: DetectionOptions = {}): DetectionResult {
  const byteLength = new TextEncoder().encode(input).byteLength;
  if (options.signal?.aborted) return { status: "cancelled", byteLength, suggestions: [] };
  if (byteLength > (options.maxBytes ?? DEFAULT_MAX_BYTES)) {
    return { status: "too-large", byteLength, suggestions: [] };
  }

  const now = options.now ?? Date.now;
  const startedAt = now();
  const timedOut = () => now() - startedAt > (options.deadlineMs ?? DEFAULT_DEADLINE_MS);
  const value = input.trim();
  if (!value) return { status: "unknown", byteLength, suggestions: [] };

  let suggestions: DetectionSuggestion[] = [];
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
    suggestions = [suggestion("jwt", 1, "jwt-inspector", "解析并校验 JWT")];
  } else {
    try {
      JSON.parse(value);
      suggestions = [suggestion("json", 1, "json-format", "格式化 JSON")];
    } catch {
      if (/^<\?xml\s|^<[A-Za-z][\s\S]*>$/i.test(value)) {
        suggestions = [suggestion("xml", 0.95, "data-converter", "转换 XML 数据")];
      } else if (/^https?:\/\/\S+$/i.test(value)) {
        suggestions = [suggestion("url", 0.95, "codec", "解析或编码 URL")];
      } else if (/^[^\n,]+,[^\n,]+(?:\n[^\n,]+,[^\n,]+)+$/.test(value)) {
        suggestions = [suggestion("csv", 0.9, "data-converter", "转换 CSV 数据")];
      } else if (/^(?:[A-Za-z0-9_.-]+\s*=\s*.+)(?:\n|$)/m.test(value)) {
        suggestions = [suggestion("toml", 0.82, "data-converter", "转换 TOML 数据")];
      } else if (/^(?:[A-Za-z0-9_.-]+\s*:\s*.+)(?:\n|$)/m.test(value)) {
        suggestions = [suggestion("yaml", 0.82, "data-converter", "转换 YAML 数据")];
      } else if (value.length >= 8 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
        suggestions = [suggestion("base64", 0.75, "codec", "解码 Base64")];
      }
    }
  }

  if (options.signal?.aborted) return { status: "cancelled", byteLength, suggestions: [] };
  if (timedOut()) return { status: "timed-out", byteLength, suggestions: [] };
  return { status: suggestions.length > 0 ? "detected" : "unknown", byteLength, suggestions };
}
