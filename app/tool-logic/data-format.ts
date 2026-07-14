import { JSONPath } from "jsonpath-plus";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export type DataFormat = "json" | "yaml";

export function convertData(
  input: string,
  from: DataFormat,
  to: DataFormat,
): string {
  const value = from === "json" ? JSON.parse(input) : parseYaml(input);
  return to === "json" ? JSON.stringify(value, null, 2) : stringifyYaml(value);
}

export function queryJsonPath(input: string, path: string): unknown[] {
  const value = JSON.parse(input);
  return JSONPath({ path, json: value, wrap: true }) as unknown[];
}
