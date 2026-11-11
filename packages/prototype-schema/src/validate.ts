import {
  PROTOTYPE_SCHEMA_VERSION,
  type PrototypeDocument,
  type PrototypeNode,
  type ValidationIssue,
  type ValidationResult
} from "./types.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const issue = (issues: ValidationIssue[], path: string, code: string, message: string): void => {
  issues.push({ path, code, message });
};

function validateNode(value: unknown, path: string, issues: ValidationIssue[], ids: Set<string>): void {
  if (!isRecord(value)) {
    issue(issues, path, "type", "Node must be an object.");
    return;
  }
  if (typeof value.id !== "string" || value.id.length === 0) {
    issue(issues, `${path}.id`, "required", "Node id must be a non-empty string.");
  } else if (ids.has(value.id)) {
    issue(issues, `${path}.id`, "unique", `Duplicate node id '${value.id}'.`);
  } else {
    ids.add(value.id);
  }

  if (value.type === "layout") {
    if (!isRecord(value.layout)) {
      issue(issues, `${path}.layout`, "required", "Layout configuration is required.");
    } else {
      if (value.layout.direction !== "horizontal" && value.layout.direction !== "vertical") {
        issue(issues, `${path}.layout.direction`, "enum", "Direction must be horizontal or vertical.");
      }
      if (typeof value.layout.gap !== "number" || value.layout.gap < 0) {
        issue(issues, `${path}.layout.gap`, "range", "Gap must be a non-negative number.");
      }
      const padding = value.layout.padding;
      if (!(typeof padding === "number" && padding >= 0) &&
          !(Array.isArray(padding) && padding.length === 4 && padding.every((item) => typeof item === "number" && item >= 0))) {
        issue(issues, `${path}.layout.padding`, "shape", "Padding must be a non-negative number or four-number tuple.");
      }
    }
    if (!Array.isArray(value.children)) {
      issue(issues, `${path}.children`, "required", "Layout children must be an array.");
    } else {
      value.children.forEach((child, index) => validateNode(child, `${path}.children[${index}]`, issues, ids));
    }
    return;
  }

  if (value.type === "component") {
    if (typeof value.componentId !== "string" || value.componentId.length === 0) {
      issue(issues, `${path}.componentId`, "required", "componentId is required.");
    }
    if (!isRecord(value.props)) {
      issue(issues, `${path}.props`, "type", "Component props must be an object.");
    }
    if (value.children !== undefined) {
      if (!Array.isArray(value.children)) {
        issue(issues, `${path}.children`, "type", "Component children must be an array.");
      } else {
        value.children.forEach((child, index) => validateNode(child, `${path}.children[${index}]`, issues, ids));
      }
    }
    return;
  }

  if (value.type === "text") {
    if (typeof value.text !== "string") {
      issue(issues, `${path}.text`, "required", "Text content is required.");
    }
    return;
  }

  issue(issues, `${path}.type`, "enum", "Node type must be layout, component, or text.");
}

export function validatePrototype(value: unknown): ValidationResult<PrototypeDocument> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return { valid: false, issues: [{ path: "$", code: "type", message: "Prototype must be an object." }] };
  }
  if (value.schemaVersion !== PROTOTYPE_SCHEMA_VERSION) {
    issue(issues, "$.schemaVersion", "version", `schemaVersion must be '${PROTOTYPE_SCHEMA_VERSION}'.`);
  }
  if (!isRecord(value.metadata)) {
    issue(issues, "$.metadata", "required", "Metadata is required.");
  } else {
    for (const field of ["id", "title", "createdAt", "catalogVersion"] as const) {
      if (typeof value.metadata[field] !== "string" || value.metadata[field].length === 0) {
        issue(issues, `$.metadata.${field}`, "required", `${field} must be a non-empty string.`);
      }
    }
    if (typeof value.metadata.createdAt === "string" && Number.isNaN(Date.parse(value.metadata.createdAt))) {
      issue(issues, "$.metadata.createdAt", "format", "createdAt must be an ISO-8601 timestamp.");
    }
  }
  if (!isRecord(value.viewport)) {
    issue(issues, "$.viewport", "required", "Viewport is required.");
  } else {
    for (const dimension of ["width", "height"] as const) {
      const dimensionValue = value.viewport[dimension];
      if (typeof dimensionValue !== "number" || !Number.isFinite(dimensionValue) || dimensionValue <= 0) {
        issue(issues, `$.viewport.${dimension}`, "range", `${dimension} must be a positive number.`);
      }
    }
  }
  validateNode(value.root, "$.root", issues, new Set<string>());
  return issues.length === 0
    ? { valid: true, value: value as unknown as PrototypeDocument, issues }
    : { valid: false, issues };
}

export function assertPrototype(value: unknown): PrototypeDocument {
  const result = validatePrototype(value);
  if (!result.valid || !result.value) {
    throw new Error(result.issues.map((entry) => `${entry.path}: ${entry.message}`).join("\n"));
  }
  return result.value;
}

export function walkPrototype(root: PrototypeNode, visit: (node: PrototypeNode) => void): void {
  visit(root);
  if ("children" in root && root.children) {
    root.children.forEach((child) => walkPrototype(child, visit));
  }
}
