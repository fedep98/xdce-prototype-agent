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
      options: ["primary", "secondary"],
      optionsCompleteness: "complete",
      evidence: "extracted"
    }],
    variants: [],
    outputs: [],
    constraints: [],
    provenance: {
      project: "XDCE0",
      repository: "xdce-widget",
      branch: "master",
      paths: ["test/fixture-button.component.ts"],
      status: "verified",
      verifiedAt: "2026-01-01T00:00:00.000Z",
      evidence: [{ path: "test/fixture-button.component.ts", kind: "extracted" }]
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

test("enforces verified modal IDS constraints with a structured question", () => {
  const modalCatalog: XdceCatalog = {
    ...catalog,
    components: [{
      id: "modal",
      selector: "nbp-modal",
      name: "Modal",
      category: "user-feedback",
      properties: [],
      variants: [],
      outputs: [],
      constraints: ["XL requires idsMode."],
      provenance: {
        project: "XDCE0",
        repository: "xdce-widget",
        branch: "master",
        paths: ["src/user-feedback/nbp-modal/nbp-modal.component.ts"],
        status: "verified",
        verifiedAt: "2026-01-01T00:00:00.000Z",
        evidence: [{
          path: "src/user-feedback/nbp-modal/nbp-modal.component.ts",
          kind: "extracted"
        }]
      }
    }]
  };
  const result = generatePrototype(new CatalogStore(modalCatalog), {
    title: "Dialog",
    layout: "vertical",
    components: [{ componentId: "modal", props: { nbpSize: "XL" } }]
  });
  assert.equal(result.status, "needs-input");
  if (result.status === "needs-input") {
    assert.equal(result.questions[0]?.field, "components[0].props.idsMode");
  }
});
