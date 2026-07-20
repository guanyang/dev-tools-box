import { Validator, type Schema, type SchemaDraft } from "@cfworker/json-schema";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { JSONPath } from "jsonpath-plus";
import Papa from "papaparse";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { format as formatSqlText, type SqlLanguage } from "sql-formatter";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export type DataFormat = "json" | "yaml" | "xml" | "toml" | "csv";
export type SqlDialect = SqlLanguage;
export type SqlKeywordCase = "preserve" | "upper" | "lower";

const xmlOptions = { ignoreAttributes: false, attributeNamePrefix: "@_" };

function parseData(input: string, format: DataFormat): unknown {
  if (format === "json") return JSON.parse(input);
  if (format === "yaml") return parseYaml(input);
  if (format === "toml") return parseToml(input);
  if (format === "xml") return new XMLParser(xmlOptions).parse(input);

  const result = Papa.parse<Record<string, string>>(input, { header: true, skipEmptyLines: true });
  if (result.errors.length > 0) throw new Error(result.errors[0].message);
  return result.data;
}

function stringifyData(value: unknown, format: DataFormat): string {
  if (format === "json") return JSON.stringify(value, null, 2);
  if (format === "yaml") return stringifyYaml(value);
  if (format === "toml") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("TOML 顶层必须是对象");
    return stringifyToml(value as Record<string, unknown>);
  }
  if (format === "xml") {
    if (!value || typeof value !== "object") throw new Error("XML 顶层必须是对象");
    return new XMLBuilder({ ...xmlOptions, format: true }).build(value);
  }
  if (!Array.isArray(value)) throw new Error("CSV 输出需要对象数组");
  return Papa.unparse(value);
}

export function convertData(
  input: string,
  from: DataFormat,
  to: DataFormat,
): string {
  return stringifyData(parseData(input, from), to);
}

export function queryJsonPath(input: string, path: string): unknown[] {
  const value = JSON.parse(input);
  return JSONPath({ path, json: value, wrap: true }) as unknown[];
}

export function validateJsonSchema(input: string, schemaInput: string): { valid: boolean; errors: string[] } {
  const data = JSON.parse(input);
  const schema = JSON.parse(schemaInput) as Schema | boolean;
  const schemaUrl = typeof schema === "object" && schema ? schema.$schema : undefined;
  const draft: SchemaDraft = schemaUrl?.includes("2020-12")
    ? "2020-12"
    : schemaUrl?.includes("2019-09")
      ? "2019-09"
      : schemaUrl?.includes("draft-04")
        ? "4"
        : "7";
  const result = new Validator(schema, draft, false).validate(data);
  const errors = result.errors.filter((error) => {
    return !result.errors.some((other) => {
      return other !== error && other.instanceLocation.startsWith(`${error.instanceLocation}/`);
    });
  });
  return {
    valid: result.valid,
    errors: errors.map((error) => `${error.instanceLocation.replace(/^#/, "") || "/"} ${error.error}`),
  };
}

export function formatSql(input: string, dialect: SqlLanguage = "sql", keywordCase: SqlKeywordCase = "upper"): string {
  return formatSqlText(input, { language: dialect, keywordCase, tabWidth: 2 });
}
