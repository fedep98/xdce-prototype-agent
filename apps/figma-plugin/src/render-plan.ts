import { assertPrototype, type PrototypeDocument, type PrototypeNode } from "@xdce/prototype-schema";

export interface RenderPlanNode {
  id: string;
  kind: "frame" | "text" | "native-component" | "fallback-component";
  name: string;
  componentKey?: string;
  warning?: string;
  children: RenderPlanNode[];
}

export interface ComponentMapping {
  [componentId: string]: string;
}

function planNode(node: PrototypeNode, mapping: ComponentMapping): RenderPlanNode {
  if (node.type === "layout") {
    return {
      id: node.id,
      kind: "frame",
      name: node.name ?? node.id,
      children: node.children.map((child) => planNode(child, mapping))
    };
  }
  if (node.type === "text") {
    return { id: node.id, kind: "text", name: node.text, children: [] };
  }
  const componentKey = mapping[node.componentId];
  return componentKey
    ? {
        id: node.id,
        kind: "native-component",
        name: node.componentId,
        componentKey,
        children: (node.children ?? []).map((child) => planNode(child, mapping))
      }
    : {
        id: node.id,
        kind: "fallback-component",
        name: `[FALLBACK] ${node.componentId}`,
        warning: `No Figma library mapping for '${node.componentId}'. This is a visual reconstruction, not a native instance.`,
        children: (node.children ?? []).map((child) => planNode(child, mapping))
      };
}

export function createRenderPlan(value: unknown, mapping: ComponentMapping = {}): {
  document: PrototypeDocument;
  root: RenderPlanNode;
  warnings: string[];
} {
  const document = assertPrototype(value);
  const root = planNode(document.root, mapping);
  const warnings: string[] = [];
  const visit = (node: RenderPlanNode): void => {
    if (node.warning) warnings.push(node.warning);
    node.children.forEach(visit);
  };
  visit(root);
  return { document, root, warnings };
}
