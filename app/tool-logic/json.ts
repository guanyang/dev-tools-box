export type DiffStatus = "same" | "changed" | "added" | "removed";
export type JsonDiffLine = { path: string; left: string; right: string; status: DiffStatus };
type JsonPathToken = string | number;

export function parseJson(input: string): { value: unknown; error: string } {
  try {
    return { value: JSON.parse(input), error: "" };
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

function flattenJson(value: unknown, path = "$", rows = new Map<string, string>()) {
  if (Array.isArray(value)) {
    if (value.length === 0) rows.set(path, "[]");
    value.forEach((item, index) => flattenJson(item, `${path}[${index}]`, rows));
    return rows;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) rows.set(path, "{}");
    entries.forEach(([key, item]) => flattenJson(item, `${path}.${key}`, rows));
    return rows;
  }
  rows.set(path, JSON.stringify(value));
  return rows;
}

function flattenJsonValues(value: unknown, path = "$", rows = new Map<string, unknown>()) {
  if (Array.isArray(value)) {
    if (value.length === 0) rows.set(path, []);
    value.forEach((item, index) => flattenJsonValues(item, `${path}[${index}]`, rows));
    return rows;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) rows.set(path, {});
    entries.forEach(([key, item]) => flattenJsonValues(item, `${path}.${key}`, rows));
    return rows;
  }
  rows.set(path, value);
  return rows;
}

export function makeJsonDiff(leftInput: string, rightInput: string) {
  const leftParsed = parseJson(leftInput);
  const rightParsed = parseJson(rightInput);
  if (leftParsed.error || rightParsed.error) {
    return {
      lines: [] as JsonDiffLine[],
      error: leftParsed.error ? `左侧 JSON：${leftParsed.error}` : `右侧 JSON：${rightParsed.error}`,
    };
  }
  const leftMap = flattenJson(leftParsed.value);
  const rightMap = flattenJson(rightParsed.value);
  const paths = Array.from(new Set([...leftMap.keys(), ...rightMap.keys()])).sort();
  return {
    error: "",
    lines: paths.map((path): JsonDiffLine => {
      const left = leftMap.get(path) ?? "";
      const right = rightMap.get(path) ?? "";
      if (left === right) return { path, left, right, status: "same" };
      if (!leftMap.has(path)) return { path, left, right, status: "added" };
      if (!rightMap.has(path)) return { path, left, right, status: "removed" };
      return { path, left, right, status: "changed" };
    }),
  };
}

export function transformJson(input: string, space: number | undefined) {
  const parsed = parseJson(input);
  return parsed.error ? parsed : { value: JSON.stringify(parsed.value, null, space), error: "" };
}

function parseJsonPath(path: string): JsonPathToken[] {
  const tokens: JsonPathToken[] = [];
  let index = 1;
  while (index < path.length) {
    if (path[index] === ".") {
      const start = index + 1;
      let end = start;
      while (end < path.length && path[end] !== "." && path[end] !== "[") end += 1;
      tokens.push(path.slice(start, end));
      index = end;
    } else if (path[index] === "[") {
      const end = path.indexOf("]", index);
      if (end === -1) break;
      tokens.push(Number(path.slice(index + 1, end)));
      index = end + 1;
    } else index += 1;
  }
  return tokens;
}

function cloneJsonValue(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function setJsonPathValue(target: unknown, tokens: JsonPathToken[], value: unknown): unknown {
  if (tokens.length === 0) return cloneJsonValue(value);
  const [head, ...rest] = tokens;
  const base = Array.isArray(target) ? [...target] : isRecord(target) ? { ...target } : typeof head === "number" ? [] : {};
  if (Array.isArray(base) && typeof head === "number") {
    base[head] = setJsonPathValue(base[head], rest, value);
    return base;
  }
  const key = String(head);
  return { ...(base as Record<string, unknown>), [key]: setJsonPathValue((base as Record<string, unknown>)[key], rest, value) };
}

function deleteJsonPathValue(target: unknown, tokens: JsonPathToken[]): unknown {
  if (tokens.length === 0) return null;
  if (!Array.isArray(target) && !isRecord(target)) return target;
  const [head, ...rest] = tokens;
  if (Array.isArray(target)) {
    const next = [...target];
    if (typeof head !== "number") return next;
    if (rest.length === 0) next.splice(head, 1);
    else next[head] = deleteJsonPathValue(next[head], rest);
    return next;
  }
  const key = String(head);
  const next = { ...target };
  if (rest.length === 0) delete next[key];
  else next[key] = deleteJsonPathValue(next[key], rest);
  return next;
}

export function mergeJsonPathValue(
  leftInput: string,
  rightInput: string,
  path: string,
  direction: "left-to-right" | "right-to-left",
): { value: string; error: string } {
  const leftParsed = parseJson(leftInput);
  const rightParsed = parseJson(rightInput);
  if (leftParsed.error || rightParsed.error) {
    return { value: "", error: leftParsed.error || rightParsed.error };
  }
  const sourceValue = direction === "left-to-right" ? leftParsed.value : rightParsed.value;
  const targetValue = direction === "left-to-right" ? rightParsed.value : leftParsed.value;
  const sourceMap = flattenJsonValues(sourceValue);
  const tokens = parseJsonPath(path);
  const nextValue = sourceMap.has(path)
    ? setJsonPathValue(targetValue, tokens, sourceMap.get(path))
    : deleteJsonPathValue(targetValue, tokens);
  return { value: JSON.stringify(nextValue, null, 2), error: "" };
}
