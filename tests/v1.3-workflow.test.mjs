import assert from "node:assert/strict";
import test from "node:test";

import { analyzePasswordStrength } from "../app/tool-logic/password.ts";
import { detectInput } from "../app/tool-logic/smart-detection.ts";
import { inspectJwt, verifyJwt } from "../app/tool-logic/jwt.ts";
import { generateQrDataUrl } from "../app/tool-logic/qr.ts";
import { executeHeavyTask } from "../app/tool-logic/worker-tasks.ts";
import { getCompatibleTargets, tools } from "../app/tools.ts";
import { runWorkerTask } from "../app/worker-client.ts";

test("detects pasted structured content within explicit limits", () => {
  assert.deepEqual(detectInput('{"service":"api"}').suggestions.map((item) => item.kind), ["json"]);
  assert.equal(detectInput("service: api\nactive: true").suggestions[0]?.kind, "yaml");
  assert.equal(
    detectInput("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature").suggestions[0]?.kind,
    "jwt",
  );
  assert.equal(detectInput("x".repeat(9), { maxBytes: 8 }).status, "too-large");

  const controller = new AbortController();
  controller.abort();
  assert.equal(detectInput("{}", { signal: controller.signal }).status, "cancelled");
  let clock = 0;
  assert.equal(detectInput("plain text", { deadlineMs: 40, now: () => (clock += 50) }).status, "timed-out");
});

test("tool registry exposes typed, bounded execution capabilities", () => {
  assert.ok(tools.every((tool) => tool.accepts.length > 0));
  assert.ok(tools.every((tool) => tool.produces.length > 0));
  assert.ok(tools.every((tool) => tool.maxInputBytes > 0));
  assert.ok(tools.every((tool) => tool.execution === "sync" || tool.execution === "worker"));

  const jsonTargets = getCompatibleTargets("json-format", "json").map((tool) => tool.id);
  assert.ok(jsonTargets.includes("data-converter"));
  assert.ok(jsonTargets.includes("codec"));
  assert.ok(!jsonTargets.includes("json-format"));
});

test("heavy task seam reports progress and supports structured conversion", async () => {
  const progress = [];
  const result = await executeHeavyTask(
    { type: "data-convert", input: '{"service":"api"}', from: "json", to: "yaml" },
    (value) => progress.push(value),
  );
  assert.match(result, /service: api/);
  assert.deepEqual(progress, [0, 100]);
});

test("heavy task runner rejects an already-cancelled request", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    runWorkerTask({ type: "json-transform", input: "{}", space: 2 }, { signal: controller.signal }),
    (error) => error instanceof DOMException && error.name === "AbortError",
  );
});

test("inspects JWT claims and verifies a JWK signature locally", async () => {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  const jwk = { kty: "oct", k: "eW91ci0yNTYtYml0LXNlY3JldA", alg: "HS256" };
  const inspected = inspectJwt(token);
  assert.equal(inspected.header.alg, "HS256");
  assert.equal(inspected.payload.name, "John Doe");
  assert.equal((await verifyJwt(token, jwk)).valid, true);
  assert.equal((await verifyJwt(`${token.slice(0, -1)}x`, jwk)).valid, false);
});

test("password analysis flags weak values without retaining input", () => {
  const weak = analyzePasswordStrength("password123");
  const strong = analyzePasswordStrength("A9!mQ2#zR7@kL4$x");
  assert.ok(weak.score <= 1);
  assert.ok(weak.warnings.length > 0);
  assert.ok(strong.score >= 3);
  assert.ok(strong.entropyBits > weak.entropyBits);
  assert.equal("password" in strong, false);
});

test("generates a local QR image as the final typed-chain output", async () => {
  const dataUrl = await generateQrDataUrl("eyJzZXJ2aWNlIjoiYXBpIn0=");
  assert.match(dataUrl, /^data:image\/png;base64,/);
  assert.ok(getCompatibleTargets("codec", "base64").some((tool) => tool.id === "qr-generator"));
});
