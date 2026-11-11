import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CatalogStore, type XdceCatalog } from "@xdce/catalog";
import { createRequestHandler } from "./handler.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const catalogPath = process.env.XDCE_CATALOG_PATH ??
  resolve(currentDirectory, "../../../packages/xdce-catalog/catalog/xdce-widget.snapshot.json");
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

async function toRequest(request: IncomingMessage): Promise<Request> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of request) {
    const bytes = typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
    total += bytes.byteLength;
    if (total > 1_000_000) throw new Error("Request body exceeds 1 MB.");
    chunks.push(bytes);
  }
  const body = chunks.length === 0
    ? undefined
    : Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((entry) => headers.append(name, entry));
    else if (value !== undefined) headers.set(name, value);
  }
  const origin = `http://${request.headers.host ?? `${host}:${port}`}`;
  return new Request(new URL(request.url ?? "/", origin), {
    method: request.method ?? "GET",
    headers,
    ...(body ? { body } : {})
  });
}

const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as XdceCatalog;
const handleRequest = createRequestHandler(new CatalogStore(catalog));
const server = createServer(async (request, response) => {
  try {
    const result = await handleRequest(await toRequest(request));
    response.writeHead(result.status, Object.fromEntries(result.headers.entries()));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    response.writeHead(400, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  }
});

server.listen(port, host, () => {
  console.log(`XDCE API/MCP server listening on http://${host}:${port}`);
});
