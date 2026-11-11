import { CatalogStore } from "@xdce/catalog";
import { executeTool, toolDefinitions } from "./tools.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
} as const;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 1_000_000) throw new Error("Request body exceeds 1 MB.");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 1_000_000) {
    throw new Error("Request body exceeds 1 MB.");
  }
  if (!text) return {};
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object.");
  }
  return parsed as Record<string, unknown>;
}

function openApiDocument(origin: string): string {
  return `openapi: 3.0.3
info:
  title: XDCE Prototype API
  version: 0.1.0
servers:
  - url: ${origin}
paths:
  /api/components:
    get:
      operationId: listComponents
      summary: List verified XDCE components
      responses:
        "200":
          description: Catalog response
          content:
            application/json:
              schema:
                type: object
  /api/prototypes/generate:
    post:
      operationId: generatePrototype
      summary: Generate a prototype or structured requirement questions
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: Generated prototype, questions, or explicit catalog error
          content:
            application/json:
              schema:
                type: object
  /api/prototypes/validate:
    post:
      operationId: validatePrototype
      summary: Validate a canonical prototype document
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: Validation result
          content:
            application/json:
              schema:
                type: object
`;
}

export function createRequestHandler(store: CatalogStore) {
  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/health") {
        return json(200, { status: "UP", catalogStatus: store.catalog.status });
      }
      if (request.method === "GET" && url.pathname === "/openapi.yaml") {
        return new Response(openApiDocument(url.origin), {
          status: 200,
          headers: {
            "content-type": "application/yaml; charset=utf-8",
            "cache-control": "public, max-age=300",
            "x-content-type-options": "nosniff"
          }
        });
      }
      if (request.method === "GET" && url.pathname === "/api/components") {
        return json(200, executeTool(store, "list_components", {}));
      }
      if (request.method === "POST" && url.pathname === "/api/prototypes/validate") {
        const body = await readJsonBody(request);
        return json(200, executeTool(store, "validate_prototype", { prototype: body }));
      }
      if (request.method === "POST" && url.pathname === "/api/prototypes/generate") {
        const body = await readJsonBody(request);
        return json(200, executeTool(store, "generate_prototype", { request: body }));
      }
      if (request.method === "POST" && url.pathname === "/mcp") {
        const body = await readJsonBody(request);
        const method = body.method;
        const id = body.id ?? null;
        if (method === "initialize") {
          return json(200, {
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "2025-03-26",
              capabilities: { tools: {} },
              serverInfo: { name: "xdce-prototype-agent", version: "0.1.0" }
            }
          });
        }
        if (method === "tools/list") {
          return json(200, { jsonrpc: "2.0", id, result: { tools: toolDefinitions } });
        }
        if (method === "tools/call") {
          const params = body.params as Record<string, unknown> | undefined;
          const name = params?.name;
          const args = params?.arguments;
          if (typeof name !== "string" || !args || typeof args !== "object" || Array.isArray(args)) {
            throw new Error("tools/call requires params.name and object params.arguments.");
          }
          const result = executeTool(store, name, args as Record<string, unknown>);
          return json(200, {
            jsonrpc: "2.0",
            id,
            result: { content: [{ type: "text", text: JSON.stringify(result) }], isError: false }
          });
        }
        return json(400, {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unsupported method '${String(method)}'.` }
        });
      }
      return json(404, { error: "Not found" });
    } catch (error) {
      return json(400, { error: error instanceof Error ? error.message : String(error) });
    }
  };
}
