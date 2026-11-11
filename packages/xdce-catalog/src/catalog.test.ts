import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("asks for real options from the loaded catalog", () => {
  const questions = new CatalogStore(fixture).questions("fixture-button", {});
  assert.deepEqual(questions[0]?.options.map((entry) => entry.value), ["primary", "secondary"]);
});

test("checked-in snapshot contains four verified components and labels hints", async () => {
  const snapshotUrl = new URL("../catalog/xdce-widget.snapshot.json", import.meta.url);
  const snapshot = JSON.parse(await readFile(snapshotUrl, "utf8")) as XdceCatalog;
  assert.equal(snapshot.status, "ready");
  assert.deepEqual(snapshot.components.map((component) => component.id), [
    "button",
    "table",
    "input-text",
    "modal"
  ]);
  assert.ok(snapshot.components.every((component) =>
    component.provenance.status === "verified" &&
    !Number.isNaN(Date.parse(component.provenance.verifiedAt))
  ));
  const buttonStyle = snapshot.components[0]?.properties.find((property) => property.name === "nbpStyle");
  assert.equal(buttonStyle?.evidence, "documentation-hint");
  assert.equal(buttonStyle?.optionsCompleteness, "partial");
  const questions = new CatalogStore(snapshot).questions("button", {});
  const buttonType = questions.find((question) => question.field === "nbpType");
  assert.deepEqual(buttonType?.options.map((entry) => entry.value), [
    "ACTION",
    "SELECT",
    "GENERATIVE",
    "CHECK",
    "PROFILE",
    "CARD",
    "PROFILE_PG",
    "ROUNDED",
    "SEMI_ROUNDED"
  ]);
  const style = questions.find((question) => question.field === "nbpStyle");
  assert.match(style?.prompt ?? "", /hint documentali non esaustivi/i);
});
