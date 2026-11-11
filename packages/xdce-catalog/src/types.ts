export type CatalogPropertyType = "string" | "number" | "boolean" | "enum" | "object" | "array";

export interface CatalogProperty {
  name: string;
  type: CatalogPropertyType;
  required: boolean;
  description?: string;
  default?: unknown;
  options?: string[];
}

export interface CatalogVariant {
  id: string;
  label: string;
  props: Record<string, unknown>;
}

export interface ComponentProvenance {
  project: "XDCE0";
  repository: "xdce-widget";
  branch: "master";
  paths: string[];
}

export interface CatalogComponent {
  id: string;
  selector: string;
  name: string;
  description?: string;
  category: string;
  properties: CatalogProperty[];
  variants: CatalogVariant[];
  constraints: string[];
  provenance: ComponentProvenance;
}

export interface XdceCatalog {
  schemaVersion: "1.0.0";
  catalogVersion: string;
  generatedAt: string;
  source: {
    navigatorUrl: string;
    project: "XDCE0";
    repository: "xdce-widget";
    branch: "master";
  };
  status: "ready" | "blocked";
  blockedReason?: string;
  components: CatalogComponent[];
}

export interface RequirementQuestion {
  field: string;
  prompt: string;
  options: Array<{ value: string; label: string; description?: string }>;
  required: true;
}
