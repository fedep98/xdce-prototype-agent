import assert from "node:assert/strict";
import test from "node:test";
import { createRenderPlan } from "./render-plan.js";

const prototype = {
  schemaVersion: "1.0.0",
  metadata: {
    id: "e2e",
    title: "E2E",
    createdAt: "2026-01-01T00:00:00.000Z",
    catalogVersion: "test"
  },
  viewport: { width: 1440, height: 900 },
  root: {
    id: "root",
    type: "layout",
    layout: { direction: "vertical", gap: 16, padding: 24 },
    children: [{ id: "button", type: "component", componentId: "fixture-button", props: {} }]
  }
};

test("marks missing library mappings as explicit visual fallbacks", () => {
  const plan = createRenderPlan(prototype);
  assert.equal(plan.root.children[0]?.kind, "fallback-component");
  assert.match(plan.warnings[0] ?? "", /not a native instance/i);
});

test("uses a native component only when explicitly mapped", () => {
  const plan = createRenderPlan(prototype, { "fixture-button": "figma-component-key" });
  assert.equal(plan.root.children[0]?.kind, "native-component");
});
