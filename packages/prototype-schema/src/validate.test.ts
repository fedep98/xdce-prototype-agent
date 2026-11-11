import assert from "node:assert/strict";
import test from "node:test";
import { validatePrototype } from "./validate.js";

test("validates a minimal prototype", () => {
  const result = validatePrototype({
    schemaVersion: "1.0.0",
    metadata: {
      id: "sample",
      title: "Sample",
      createdAt: "2026-01-01T00:00:00.000Z",
      catalogVersion: "test"
    },
    viewport: { width: 1440, height: 900 },
    root: {
      id: "root",
      type: "layout",
      layout: { direction: "vertical", gap: 16, padding: 24 },
      children: [{ id: "title", type: "text", text: "Hello" }]
    }
  });
  assert.equal(result.valid, true);
});

test("rejects duplicate node ids", () => {
  const result = validatePrototype({
    schemaVersion: "1.0.0",
    metadata: {
      id: "sample",
      title: "Sample",
      createdAt: "2026-01-01T00:00:00.000Z",
      catalogVersion: "test"
    },
    viewport: { width: 100, height: 100 },
    root: {
      id: "same",
      type: "layout",
      layout: { direction: "vertical", gap: 0, padding: 0 },
      children: [{ id: "same", type: "text", text: "Duplicate" }]
    }
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((entry) => entry.code === "unique"));
});
