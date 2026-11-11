import {
  PROTOTYPE_SCHEMA_VERSION,
  validatePrototype,
  type ComponentNode,
  type PrototypeDocument
} from "@xdce/prototype-schema";
import { CatalogStore, type RequirementQuestion } from "@xdce/catalog";

export interface PrototypeRequest {
  title?: string;
  description?: string;
  viewport?: { width?: number; height?: number };
  layout?: "horizontal" | "vertical";
  components?: Array<{
    componentId?: string;
    variant?: string;
    props?: Record<string, unknown>;
  }>;
}

export type GenerateResult =
  | { status: "needs-input"; questions: RequirementQuestion[] }
  | { status: "generated"; prototype: PrototypeDocument }
  | { status: "error"; code: string; message: string };

function optionQuestion(
  field: string,
  prompt: string,
  options: Array<{ value: string; label: string; description?: string }>
): RequirementQuestion {
  return { field, prompt, options, required: true };
}

function addConstraintQuestions(
  questions: RequirementQuestion[],
  componentId: string,
  props: Record<string, unknown>,
  index: number
): void {
  if (componentId !== "modal") return;
  const idsModeRequired = props.nbpSize === "XL" ||
    props.popUp === true ||
    props.popUpHorizontalButton === true ||
    props.popUpIcon !== undefined && props.popUpIcon !== null;
  if (idsModeRequired && props.idsMode !== true) {
    questions.push(optionQuestion(
      `components[${index}].props.idsMode`,
      "La configurazione modal richiesta è disponibile solo in modalità IDS. Abilitare idsMode?",
      [{ value: "true", label: "Sì, abilita IDS mode" }]
    ));
  }
  if (props.popUpIcon !== undefined && props.popUpIcon !== null && props.popUp !== true) {
    questions.push(optionQuestion(
      `components[${index}].props.popUp`,
      "popUpIcon richiede anche popUp=true. Abilitare la modalità popup?",
      [{ value: "true", label: "Sì, abilita popup" }]
    ));
  }
}

export function generatePrototype(store: CatalogStore, request: PrototypeRequest): GenerateResult {
  if (store.catalog.status !== "ready") {
    return {
      status: "error",
      code: "CATALOG_NOT_READY",
      message: store.catalog.blockedReason ?? "XDCE catalog is not ready."
    };
  }

  const questions: RequirementQuestion[] = [];
  if (!request.title?.trim()) {
    questions.push(optionQuestion("title", "Qual è il titolo della pagina?", []));
  }
  if (!request.layout) {
    questions.push(optionQuestion("layout", "Come devono essere disposti i contenuti principali?", [
      { value: "vertical", label: "Verticale", description: "Sezioni una sotto l'altra." },
      { value: "horizontal", label: "Orizzontale", description: "Sezioni affiancate." }
    ]));
  }
  if (!request.components?.length) {
    questions.push(optionQuestion(
      "components",
      "Quali componenti XDCE vuoi includere?",
      store.list().map((component) => ({
        value: component.id,
        label: component.name,
        ...(component.description ? { description: component.description } : {})
      }))
    ));
  } else {
    request.components.forEach((requested, index) => {
      if (!requested.componentId) {
        questions.push(optionQuestion(
          `components[${index}].componentId`,
          `Quale componente XDCE vuoi usare nella posizione ${index + 1}?`,
          store.list().map((component) => ({ value: component.id, label: component.name }))
        ));
        return;
      }
      const component = store.get(requested.componentId);
      if (!component) {
        questions.push(optionQuestion(
          `components[${index}].componentId`,
          `'${requested.componentId}' non è nel catalogo. Scegli un componente disponibile.`,
          store.list().map((entry) => ({ value: entry.id, label: entry.name }))
        ));
        return;
      }
      questions.push(...store.questions(component.id, requested.props ?? {}).map((question) => ({
        ...question,
        field: `components[${index}].props.${question.field}`
      })));
      for (const property of component.properties) {
        const supplied = requested.props?.[property.name];
        if (supplied !== undefined &&
            property.optionsCompleteness === "complete" &&
            property.options &&
            !property.options.includes(String(supplied))) {
          questions.push(optionQuestion(
            `components[${index}].props.${property.name}`,
            `Il valore '${String(supplied)}' non è disponibile per ${property.name}.`,
            property.options.map((value) => ({ value, label: value }))
          ));
        }
      }
      addConstraintQuestions(questions, component.id, requested.props ?? {}, index);
    });
  }

  if (questions.length > 0) return { status: "needs-input", questions };

  const components: ComponentNode[] = request.components!.map((requested, index) => ({
    id: `component-${index + 1}`,
    type: "component",
    componentId: requested.componentId!,
    ...(requested.variant ? { variant: requested.variant } : {}),
    props: requested.props ?? {}
  }));
  const prototype: PrototypeDocument = {
    schemaVersion: PROTOTYPE_SCHEMA_VERSION,
    metadata: {
      id: `prototype-${Date.now()}`,
      title: request.title!,
      ...(request.description ? { description: request.description } : {}),
      createdAt: new Date().toISOString(),
      catalogVersion: store.catalog.catalogVersion
    },
    viewport: {
      width: request.viewport?.width ?? 1440,
      height: request.viewport?.height ?? 900,
      background: "#ffffff"
    },
    root: {
      id: "page-root",
      type: "layout",
      name: request.title!,
      layout: {
        direction: request.layout!,
        gap: 16,
        padding: 24,
        width: "fill",
        height: "hug"
      },
      children: components
    }
  };
  const validation = validatePrototype(prototype);
  return validation.valid
    ? { status: "generated", prototype }
    : { status: "error", code: "GENERATOR_INVALID_OUTPUT", message: JSON.stringify(validation.issues) };
}
