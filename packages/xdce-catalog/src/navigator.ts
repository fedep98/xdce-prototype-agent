import type { CatalogComponent, CatalogProperty, CatalogVariant, XdceCatalog } from "./types.js";

const NAVIGATOR_URL = process.env.NAVIGATOR_URL ?? "http://localhost:12345";
const coordinates = { project: "XDCE0", repo: "xdce-widget", at: "master" } as const;

interface NavigatorModule {
  name?: string;
  enabled?: boolean;
  actions?: string[];
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${NAVIGATOR_URL}${path}`, body === undefined
    ? { method: "GET", signal: AbortSignal.timeout(15_000) }
    : {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000)
      });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

function collectStrings(value: unknown, result: string[] = []): string[] {
  if (typeof value === "string") {
    result.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, result));
  } else if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectStrings(item, result));
  }
  return result;
}

function findPaths(payload: unknown): string[] {
  return [...new Set(collectStrings(payload).filter((value) =>
    value.startsWith("src/") && /\.(component\.(ts|html|scss)|ts)$/.test(value)
  ))];
}

function extractSelector(source: string): string | undefined {
  return source.match(/selector\s*:\s*['"]([^'"]+)['"]/)?.[1];
}

function extractInputs(source: string): CatalogProperty[] {
  const properties = new Map<string, CatalogProperty>();
  const decoratorPattern = /@Input\(([^)]*)\)\s+(?:public\s+)?([A-Za-z0-9_]+)(?:\??\s*:\s*([^;=\n]+))?(?:\s*=\s*([^;\n]+))?/g;
  for (const match of source.matchAll(decoratorPattern)) {
    const name = match[2]!;
    const typeSource = match[3]?.trim() ?? "unknown";
    const options = [...typeSource.matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]!);
    properties.set(name, {
      name,
      type: options.length > 0 ? "enum" : inferType(typeSource),
      required: /required\s*:\s*true/.test(match[1] ?? ""),
      ...(options.length > 0 ? { options } : {}),
      ...(match[4] ? { default: match[4].trim() } : {})
    });
  }
  const signalPattern = /(?:readonly\s+)?([A-Za-z0-9_]+)\s*=\s*input(\.required)?<([^>]+)>\(\s*([^)]*)\)/g;
  for (const match of source.matchAll(signalPattern)) {
    const name = match[1]!;
    const typeSource = match[3]?.trim() ?? "unknown";
    const options = [...typeSource.matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]!);
    properties.set(name, {
      name,
      type: options.length > 0 ? "enum" : inferType(typeSource),
      required: match[2] === ".required",
      ...(options.length > 0 ? { options } : {}),
      ...(match[4]?.trim() ? { default: match[4].trim() } : {})
    });
  }
  return [...properties.values()];
}

function inferType(source: string): CatalogProperty["type"] {
  if (source.includes("boolean")) return "boolean";
  if (source.includes("number")) return "number";
  if (source.includes("[]") || source.includes("Array<")) return "array";
  if (source.includes("string")) return "string";
  return "object";
}

function componentId(path: string): string {
  return path
    .replace(/^.*\/src\/(?:base|components?)\//, "")
    .replace(/\/[^/]+\.component\.ts$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function readFile(path: string): Promise<string> {
  const payload = await request<unknown>("/bitbucket/file", {
    ...coordinates,
    path,
    maxChars: 100_000
  });
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    for (const key of ["content", "text", "value", "source"]) {
      if (typeof record[key] === "string") return record[key];
    }
  }
  const records = collectStrings(payload).filter((value) => value.length > 20);
  return records.sort((a, b) => b.length - a.length)[0] ?? "";
}

function deriveVariants(properties: CatalogProperty[]): CatalogVariant[] {
  const variantProperty = properties.find((property) =>
    property.options?.length &&
    /^(variant|type|style|size|state|status|appearance)$/i.test(property.name)
  );
  return variantProperty?.options?.map((option) => ({
    id: `${variantProperty.name}-${option}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label: `${variantProperty.name}: ${option}`,
    props: { [variantProperty.name]: option }
  })) ?? [];
}

export async function ingestCatalog(): Promise<XdceCatalog> {
  await request("/health");
  const modules = await request<unknown>("/modules");
  const discovered = collectStrings(modules).map((value) => value.toLowerCase());
  const requiredCapabilities = ["/bitbucket/files", "/bitbucket/file", "/bitbucket/search-code"];
  if (!discovered.some((value) => value.includes("bitbucket")) ||
      !requiredCapabilities.every((capability) =>
        discovered.some((value) => value.includes(capability) || value.includes(capability.split("/").pop()!))
      )) {
    throw new Error(`Navigator discovery does not expose all required Bitbucket capabilities: ${requiredCapabilities.join(", ")}.`);
  }

  const searchPayloads = await Promise.all(["nbp-button", "table"].map((query) =>
    request<unknown>("/bitbucket/search-code", {
      query,
      project: coordinates.project,
      repo: coordinates.repo,
      ext: "ts",
      limit: 100
    })
  ));
  const filesPayload = await request<unknown>("/bitbucket/files", {
    ...coordinates,
    path: "src/",
    limit: 5000
  });
  const allPaths = [...new Set([
    ...findPaths(filesPayload),
    ...searchPayloads.flatMap((payload) => findPaths(payload))
  ])];
  const componentPaths = allPaths.filter((path) => path.endsWith(".component.ts"));
  if (componentPaths.length === 0) {
    throw new Error("No Angular component source paths were returned by /bitbucket/files.");
  }

  const preferred = ["button", "table"];
  const selected = componentPaths
    .sort((a, b) => {
      const aRank = preferred.findIndex((name) => a.toLowerCase().includes(name));
      const bRank = preferred.findIndex((name) => b.toLowerCase().includes(name));
      return (aRank < 0 ? 99 : aRank) - (bRank < 0 ? 99 : bRank) || a.localeCompare(b);
    })
    .slice(0, Math.max(4, Math.min(componentPaths.length, 20)));

  const components: CatalogComponent[] = [];
  for (const path of selected) {
    const source = await readFile(path);
    const selector = extractSelector(source);
    if (!selector) continue;
    const properties = extractInputs(source);
    const stem = path.replace(/\.ts$/, "");
    const related = allPaths.filter((candidate) => candidate.startsWith(stem.replace(/\.component$/, "")));
    components.push({
      id: componentId(path),
      selector,
      name: selector,
      category: path.includes("/base/") ? "base" : "component",
      properties,
      variants: deriveVariants(properties),
      constraints: [
        "Only properties and enum values extracted from repository source are accepted.",
        "Figma native instances require an explicit local component mapping."
      ],
      provenance: {
        project: "XDCE0",
        repository: "xdce-widget",
        branch: "master",
        paths: [path, ...related].filter((value, index, all) => all.indexOf(value) === index)
      }
    });
  }

  if (components.length < 4 ||
      !components.some((component) => /button/i.test(component.id)) ||
      !components.some((component) => /table/i.test(component.id))) {
    throw new Error("Ingestion did not verify at least four components including button and table; snapshot was not written.");
  }

  return {
    schemaVersion: "1.0.0",
    catalogVersion: `xdce-widget-master-${new Date().toISOString()}`,
    generatedAt: new Date().toISOString(),
    source: {
      navigatorUrl: NAVIGATOR_URL,
      project: "XDCE0",
      repository: "xdce-widget",
      branch: "master"
    },
    status: "ready",
    components
  };
}
