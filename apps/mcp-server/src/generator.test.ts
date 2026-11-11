import assert from "node:assert/strict";
import test from "node:test";
import { CatalogStore, type XdceCatalog } from "@xdce/catalog";
import { generatePrototype } from "./generator.js";

const catalog: XdceCatalog = {
  schemaVersion: "1.0.0",
  catalogVersion: "test-catalog",
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
    name: "Fixture Button",
    category: "test-only",
    properties: [{
      name: "style",
      type: "enum",
      required: true,
      options: ["primary", "secondary"]
    }],
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

test("does not silently choose an important style", () => {
  const result = generatePrototype(new CatalogStore(catalog), {
    title: "Payments",
    layout: "vertical",
    components: [{ componentId: "fixture-button", props: {} }]
  });
  assert.equal(result.status, "needs-input");
  if (result.status === "needs-input") {
    assert.deepEqual(result.questions[0]?.options.map((entry) => entry.value), ["primary", "secondary"]);
  }
});

test("generates schema-valid output after requirements are complete", () => {
  const result = generatePrototype(new CatalogStore(catalog), {
    title: "Payments",
    layout: "vertical",
    components: [{ componentId: "fixture-button", props: { style: "primary" } }]
  });
  assert.equal(result.status, "generated");
  if (result.status === "generated") {
    assert.equal(result.prototype.metadata.catalogVersion, "test-catalog");
  }
});
