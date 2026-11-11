import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CatalogStore, type XdceCatalog } from "@xdce/catalog";
import { executeTool, toolDefinitions } from "./tools.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const catalogPath = process.env.XDCE_CATALOG_PATH ??
  resolve(currentDirectory, "../../../packages/xdce-catalog/catalog/xdce-widget.snapshot.json");
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > 1_000_000) throw new Error("Request body exceeds 1 MB.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object.");
  }
  return parsed as Record<string, unknown>;
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(JSON.stringify(body));
}

export function createApiServer(store: CatalogStore) {
  return createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        json(response, 200, { status: "UP", catalogStatus: store.catalog.status });
        return;
      }
      if (request.method === "GET" && request.url === "/api/components") {
        json(response, 200, executeTool(store, "list_components", {}));
        return;
      }
      if (request.method === "POST" && request.url === "/api/prototypes/validate") {
        const body = await readJsonBody(request);
        json(response, 200, executeTool(store, "validate_prototype", { prototype: body }));
        return;
      }
      if (request.method === "POST" && request.url === "/api/prototypes/generate") {
        const body = await readJsonBody(request);
        const result = executeTool(store, "generate_prototype", { request: body });
        json(response, 200, result);
        return;
      }
      if (request.method === "POST" && request.url === "/mcp") {
        const body = await readJsonBody(request);
        const method = body.method;
        const id = body.id ?? null;
        if (method === "initialize") {
          json(response, 200, {
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "2025-03-26",
              capabilities: { tools: {} },
              serverInfo: { name: "xdce-prototype-agent", version: "0.1.0" }
            }
          });
          return;
        }
        if (method === "tools/list") {
          json(response, 200, { jsonrpc: "2.0", id, result: { tools: toolDefinitions } });
          return;
        }
        if (method === "tools/call") {
          const params = body.params as Record<string, unknown> | undefined;
          const name = params?.name;
          const args = params?.arguments;
          if (typeof name !== "string" || !args || typeof args !== "object" || Array.isArray(args)) {
            throw new Error("tools/call requires params.name and object params.arguments.");
          }
          const result = executeTool(store, name, args as Record<string, unknown>);
          json(response, 200, {
            jsonrpc: "2.0",
            id,
            result: { content: [{ type: "text", text: JSON.stringify(result) }], isError: false }
          });
          return;
        }
        json(response, 400, {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unsupported method '${String(method)}'.` }
        });
        return;
      }
      json(response, 404, { error: "Not found" });
    } catch (error) {
      json(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  });
}

const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as XdceCatalog;
const server = createApiServer(new CatalogStore(catalog));
server.listen(port, host, () => {
  console.log(`XDCE API/MCP server listening on http://${host}:${port}`);
});
