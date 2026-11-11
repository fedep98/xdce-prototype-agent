import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CatalogStore, type XdceCatalog } from "@xdce/catalog";
import { createRequestHandler } from "./handler.js";

const snapshotUrl = new URL("../../../packages/xdce-catalog/catalog/xdce-widget.snapshot.json", import.meta.url);
const catalog = JSON.parse(await readFile(snapshotUrl, "utf8")) as XdceCatalog;
const handleRequest = createRequestHandler(new CatalogStore(catalog));

test("serves a deployment-specific OpenAPI document", async () => {
  const response = await handleRequest(new Request("https://worker.example/openapi.yaml"));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /url: https:\/\/worker\.example/);
});

test("serves the verified catalog through the Worker-compatible handler", async () => {
  const response = await handleRequest(new Request("https://worker.example/api/components"));
  const payload = await response.json() as { components: Array<{ id: string }> };
  assert.deepEqual(payload.components.map((component) => component.id), [
    "button",
    "table",
    "input-text",
    "modal"
  ]);
});
