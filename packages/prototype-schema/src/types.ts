export const PROTOTYPE_SCHEMA_VERSION = "1.0.0" as const;

export type PrototypeSchemaVersion = typeof PROTOTYPE_SCHEMA_VERSION;
export type LayoutDirection = "horizontal" | "vertical";
export type Alignment = "start" | "center" | "end" | "stretch" | "space-between";

export interface PrototypeDocument {
  schemaVersion: PrototypeSchemaVersion;
  metadata: {
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    catalogVersion: string;
  };
  viewport: {
    width: number;
    height: number;
    background?: string;
  };
  root: LayoutNode;
}

export interface LayoutNode {
  id: string;
  type: "layout";
  name?: string;
  layout: {
    direction: LayoutDirection;
    gap: number;
    padding: number | [number, number, number, number];
    align?: Alignment;
    width?: number | "fill" | "hug";
    height?: number | "fill" | "hug";
  };
  style?: NodeStyle;
  children: PrototypeNode[];
}

export interface ComponentNode {
  id: string;
  type: "component";
  componentId: string;
  variant?: string;
  props: Record<string, unknown>;
  style?: NodeStyle;
  children?: PrototypeNode[];
  interactions?: Interaction[];
}

export interface TextNode {
  id: string;
  type: "text";
  text: string;
  style?: NodeStyle & {
    fontSize?: number;
    fontWeight?: number;
  };
}

export type PrototypeNode = LayoutNode | ComponentNode | TextNode;

export interface NodeStyle {
  background?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
}

export interface Interaction {
  trigger: "click" | "change" | "submit";
  action: "navigate" | "open-overlay" | "close-overlay" | "set-state";
  target?: string;
  value?: string;
}

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  issues: ValidationIssue[];
}
