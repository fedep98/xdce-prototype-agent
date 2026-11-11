import type { PrototypeNode } from "@xdce/prototype-schema";
import { createRenderPlan, type ComponentMapping } from "./render-plan.js";

figma.showUI(__html__, { width: 520, height: 620 });

async function renderNode(node: PrototypeNode, mapping: ComponentMapping): Promise<SceneNode> {
  if (node.type === "text") {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    const text = figma.createText();
    text.name = node.id;
    text.characters = node.text;
    text.fontSize = node.style?.fontSize ?? 16;
    return text;
  }

  if (node.type === "component") {
    const key = mapping[node.componentId];
    if (key) {
      const component = await figma.importComponentByKeyAsync(key);
      const instance = component.createInstance();
      instance.name = node.componentId;
      return instance;
    }
    const fallback = figma.createFrame();
    fallback.name = `[FALLBACK - NOT NATIVE] ${node.componentId}`;
    fallback.layoutMode = "VERTICAL";
    fallback.itemSpacing = 8;
    fallback.paddingTop = fallback.paddingRight = fallback.paddingBottom = fallback.paddingLeft = 12;
    fallback.fills = [{ type: "SOLID", color: { r: 1, g: 0.96, b: 0.82 } }];
    fallback.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.55, b: 0.05 } }];
    fallback.cornerRadius = 4;
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    const label = figma.createText();
    label.characters = `Fallback visuale: ${node.componentId}`;
    fallback.appendChild(label);
    for (const child of node.children ?? []) fallback.appendChild(await renderNode(child, mapping));
    return fallback;
  }

  const frame = figma.createFrame();
  frame.name = node.name ?? node.id;
  frame.layoutMode = node.layout.direction === "horizontal" ? "HORIZONTAL" : "VERTICAL";
  frame.itemSpacing = node.layout.gap;
  if (typeof node.layout.padding === "number") {
    frame.paddingTop = node.layout.padding;
    frame.paddingRight = node.layout.padding;
    frame.paddingBottom = node.layout.padding;
    frame.paddingLeft = node.layout.padding;
  } else {
    frame.paddingTop = node.layout.padding[0];
    frame.paddingRight = node.layout.padding[1];
    frame.paddingBottom = node.layout.padding[2];
    frame.paddingLeft = node.layout.padding[3];
  }
  for (const child of node.children) frame.appendChild(await renderNode(child, mapping));
  return frame;
}

figma.ui.onmessage = async (rawMessage: unknown) => {
  try {
    if (!rawMessage || typeof rawMessage !== "object") throw new Error("Invalid UI message.");
    const message = rawMessage as Record<string, unknown>;
    if (message.type !== "import") return;
    const mapping = (message.mapping ?? {}) as ComponentMapping;
    const plan = createRenderPlan(message.prototype, mapping);
    const root = await renderNode(plan.document.root, mapping);
    root.name = plan.document.metadata.title;
    figma.currentPage.appendChild(root);
    figma.currentPage.selection = [root];
    figma.viewport.scrollAndZoomIntoView([root]);
    figma.ui.postMessage({ type: "success", warnings: plan.warnings });
  } catch (error) {
    figma.ui.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
};
