import assert from "node:assert/strict";
import test from "node:test";
import { convertData, formatSql, validateJsonSchema } from "../app/tool-logic/data-format.ts";

test("round-trips XML, TOML and CSV through structured JSON", () => {
  assert.deepEqual(JSON.parse(convertData("service = 'api'\nport = 443", "toml", "json")), { service: "api", port: 443 });
  assert.deepEqual(JSON.parse(convertData("name,active\nAda,true\nLin,false", "csv", "json")), [
    { name: "Ada", active: "true" },
    { name: "Lin", active: "false" },
  ]);
  assert.match(convertData('{"service":{"name":"api"}}', "json", "xml"), /<service>/);
  assert.deepEqual(JSON.parse(convertData("<service><name>api</name></service>", "xml", "json")), { service: { name: "api" } });
});

test("validates JSON data against a JSON Schema", () => {
  const schema = '{"type":"object","required":["name"],"properties":{"name":{"type":"string"}}}';
  assert.deepEqual(validateJsonSchema('{"name":"Ada"}', schema), { valid: true, errors: [] });
  const invalid = validateJsonSchema('{"name":7}', schema);
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors[0], /string/);
});

test("formats SQL with selectable dialect and keyword case", () => {
  assert.equal(formatSql("select id,name from users where active=true", "sql", "upper"), "SELECT\n  id,\n  name\nFROM\n  users\nWHERE\n  active = TRUE");
});
