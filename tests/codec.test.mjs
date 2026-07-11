import assert from "node:assert/strict";
import test from "node:test";

import { codecMethods, runCodec } from "../app/codec.ts";

test("exposes exactly 12 encode and 12 decode methods", () => {
  assert.equal(codecMethods.filter((method) => method.group === "encode").length, 12);
  assert.equal(codecMethods.filter((method) => method.group === "decode").length, 12);
});

test("encodes and decodes common text formats", async () => {
  const input = "你好, DevTools!";

  const unicode = await runCodec("unicode-encode", input);
  assert.equal(await runCodec("unicode-decode", unicode), input);

  const utf16 = await runCodec("utf16-encode", input);
  assert.equal(await runCodec("utf16-decode", utf16), input);

  const base64 = await runCodec("base64-encode", input);
  assert.equal(await runCodec("base64-decode", base64), input);

  const hex = await runCodec("hex-encode", input);
  assert.equal(await runCodec("hex-decode", hex), input);

  const gzip = await runCodec("gzip-compress", input);
  assert.equal(await runCodec("gzip-decompress", gzip), input);
});

test("matches known digest and parser results", async () => {
  assert.equal(await runCodec("md5", "abc"), "900150983cd24fb0d6963f7d28e17f72");
  assert.equal(await runCodec("sha1", "abc"), "a9993e364706816aba3e25717850c26c9cd0d89d");
  assert.equal(
    await runCodec("url-params", "https://example.com?a=1&a=2&name=dev"),
    JSON.stringify({ a: ["1", "2"], name: "dev" }, null, 2),
  );
  assert.equal(
    await runCodec("proto-hex", "0896011203616263"),
    JSON.stringify({ field_1: 150, field_2: "abc" }, null, 2),
  );
});
