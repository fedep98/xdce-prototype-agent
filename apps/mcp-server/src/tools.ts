import { validatePrototype } from "@xdce/prototype-schema";
import { CatalogStore } from "@xdce/catalog";
import { generatePrototype, type PrototypeRequest } from "./generator.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "list_components",
    description: "List verified XDCE components and their provenance.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      additionalProperties: false
    }
  },
  {
    name: "get_component",
    description: "Get one verified XDCE component, properties, variants and constraints.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
      additionalProperties: false
    }
  },
  {
    name: "validate_prototype",
    description: "Validate a canonical prototype document.",
    inputSchema: {
      type: "object",
      required: ["prototype"],
      properties: { prototype: { type: "object" } },
      additionalProperties: false
    }
  },
  {
    name: "generate_prototype",
    description: "Generate a canonical prototype or structured questions with only catalog-backed options.",
    inputSchema: {
      type: "object",
      required: ["request"],
      properties: { request: { type: "object" } },
      additionalProperties: false
    }
  },
  {
    name: "refine_requirements",
    description: "Return missing fields and available XDCE options without making silent design choices.",
    inputSchema: {
      type: "object",
      required: ["request"],
      properties: { request: { type: "object" } },
      additionalProperties: false
    }
  }
];

export function executeTool(store: CatalogStore, name: string, input: Record<string, unknown>): unknown {
  switch (name) {
    case "list_components":
      return {
        status: store.catalog.status,
        catalogVersion: store.catalog.catalogVersion,
        ...(store.catalog.blockedReason ? { blockedReason: store.catalog.blockedReason } : {}),
        components: store.list(typeof input.query === "string" ? input.query : undefined)
      };
    case "get_component": {
      const component = typeof input.id === "string" ? store.get(input.id) : undefined;
      return component
        ? { found: true, component }
        : { found: false, error: "Component is not present in the verified catalog." };
    }
    case "validate_prototype":
      return validatePrototype(input.prototype);
    case "generate_prototype":
    case "refine_requirements":
      return generatePrototype(store, (input.request ?? {}) as PrototypeRequest);
    default:
      throw new Error(`Unknown tool '${name}'.`);
  }
}
