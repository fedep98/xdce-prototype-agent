import type { CatalogComponent, RequirementQuestion, XdceCatalog } from "./types.js";

export class CatalogStore {
  readonly catalog: XdceCatalog;

  constructor(catalog: XdceCatalog) {
    this.catalog = catalog;
  }

  list(query?: string): CatalogComponent[] {
    const normalized = query?.trim().toLowerCase();
    if (!normalized) return [...this.catalog.components];
    return this.catalog.components.filter((component) =>
      [component.id, component.name, component.selector, component.category, component.description ?? ""]
        .some((value) => value.toLowerCase().includes(normalized))
    );
  }

  get(id: string): CatalogComponent | undefined {
    return this.catalog.components.find((component) => component.id === id || component.selector === id);
  }

  questions(componentId: string, props: Record<string, unknown>): RequirementQuestion[] {
    const component = this.get(componentId);
    if (!component) {
      return [{
        field: "componentId",
        prompt: "Quale componente XDCE vuoi usare?",
        options: this.catalog.components.map((entry) => ({ value: entry.id, label: entry.name })),
        required: true
      }];
    }
    return component.properties
      .filter((property) =>
        !property.technical &&
        (property.required || property.decisionRequired) &&
        props[property.name] === undefined
      )
      .map((property) => ({
        field: property.name,
        prompt: property.optionsCompleteness === "partial"
          ? `Scegli ${property.name} per ${component.name}. Le opzioni mostrate sono hint documentali non esaustivi.`
          : `Scegli ${property.name} per ${component.name}.`,
        options: property.options?.map((option) => ({
          value: option,
          label: option,
          ...(property.evidence === "documentation-hint"
            ? { description: "Hint documentale; elenco non verificato come completo." }
            : {})
        })) ?? [],
        required: true
      }));
  }
}
