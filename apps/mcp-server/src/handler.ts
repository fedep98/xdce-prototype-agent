import { CatalogStore } from "@xdce/catalog";
import { executeTool, toolDefinitions } from "./tools.js";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS"
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

function parseJsonString(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} must be a non-empty JSON string.`);
  }
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${field} must encode a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function pluginResult(result: unknown): Response {
  return json(200, { result: JSON.stringify(result) });
}

function openApiDocument(origin: string): string {
  return `openapi: 3.0.3
info:
  title: XDCE Prototype API
  version: 0.1.0
servers:
  - url: ${origin}
paths:
  /api/copilot/components:
    get:
      operationId: listComponents
      summary: List verified XDCE components
      x-openai-isConsequential: false
      responses:
        "200":
          description: Catalog serialized as a JSON string
          content:
            application/json:
              schema:
                type: object
                required: [result]
                properties:
                  result:
                    type: string
  /api/copilot/generate:
    post:
      operationId: generatePrototype
      summary: Generate a prototype from a JSON-encoded request
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [requestJson]
              properties:
                requestJson:
                  type: string
      responses:
        "200":
          description: Generation result serialized as a JSON string
          content:
            application/json:
              schema:
                type: object
                required: [result]
                properties:
                  result:
                    type: string
  /api/copilot/validate:
    post:
      operationId: validatePrototype
      summary: Validate a JSON-encoded canonical prototype document
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [prototypeJson]
              properties:
                prototypeJson:
                  type: string
      responses:
        "200":
          description: Validation result serialized as a JSON string
          content:
            application/json:
              schema:
                type: object
                required: [result]
                properties:
                  result:
                    type: string
`;
}

export function createRequestHandler(store: CatalogStore) {
  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url);
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: jsonHeaders });
      }
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
      if (request.method === "GET" && url.pathname === "/api/copilot/components") {
        return pluginResult(executeTool(store, "list_components", {}));
      }
      if (request.method === "POST" && url.pathname === "/api/prototypes/validate") {
        const body = await readJsonBody(request);
        return json(200, executeTool(store, "validate_prototype", { prototype: body }));
      }
      if (request.method === "POST" && url.pathname === "/api/prototypes/generate") {
        const body = await readJsonBody(request);
        return json(200, executeTool(store, "generate_prototype", { request: body }));
      }
      if (request.method === "POST" && url.pathname === "/api/copilot/generate") {
        const body = await readJsonBody(request);
        const prototypeRequest = parseJsonString(body.requestJson, "requestJson");
        return pluginResult(executeTool(store, "generate_prototype", { request: prototypeRequest }));
      }
      if (request.method === "POST" && url.pathname === "/api/copilot/validate") {
        const body = await readJsonBody(request);
        const prototype = parseJsonString(body.prototypeJson, "prototypeJson");
        return pluginResult(executeTool(store, "validate_prototype", { prototype }));
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
