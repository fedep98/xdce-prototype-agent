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

test("serves Copilot plugin responses through a simple string contract", async () => {
  const componentsResponse = await handleRequest(new Request("https://worker.example/api/copilot/components"));
  const componentsPayload = await componentsResponse.json() as { result: string };
  const components = JSON.parse(componentsPayload.result) as {
    components: Array<{ id: string }>;
  };
  assert.deepEqual(components.components.map((component) => component.id), [
    "button",
    "table",
    "input-text",
    "modal"
  ]);

  const generateResponse = await handleRequest(new Request("https://worker.example/api/copilot/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requestJson: JSON.stringify({
        title: "Customers",
        layout: "vertical",
        components: [{ componentId: "table", props: {} }]
      })
    })
  }));
  const generatePayload = await generateResponse.json() as { result: string };
  const generation = JSON.parse(generatePayload.result) as {
    status: string;
    questions: Array<{ field: string; options: Array<{ value: string }> }>;
  };
  assert.equal(generation.status, "needs-input");
  assert.deepEqual(generation.questions[0]?.options.map((option) => option.value), [
    "NONE",
    "SINGLE",
    "MULTI"
  ]);
});
