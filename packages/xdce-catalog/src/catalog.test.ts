import assert from "node:assert/strict";
import test from "node:test";
import { CatalogStore } from "./catalog.js";
import type { XdceCatalog } from "./types.js";

const fixture: XdceCatalog = {
  schemaVersion: "1.0.0",
  catalogVersion: "test",
  generatedAt: "2026-01-01T00:00:00.000Z",
  source: {
    navigatorUrl: "http://localhost:12345",
    project: "XDCE0",
    repository: "xdce-widget",
    branch: "master"
  },
  status: "ready",
  components: [{
    id: "fixture-button",
    selector: "fixture-button",
    name: "Fixture button",
    category: "test-only",
    properties: [{ name: "style", type: "enum", required: true, options: ["primary", "secondary"] }],
    variants: [],
    constraints: [],
    provenance: {
      project: "XDCE0",
      repository: "xdce-widget",
      branch: "master",
      paths: ["test/fixture-button.component.ts"]
    }
  }]
};

test("asks for real options from the loaded catalog", () => {
  const questions = new CatalogStore(fixture).questions("fixture-button", {});
  assert.deepEqual(questions[0]?.options.map((entry) => entry.value), ["primary", "secondary"]);
});
