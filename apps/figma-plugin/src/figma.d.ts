interface BaseNode {
  name: string;
}
interface SceneNode extends BaseNode {}
interface ChildrenMixin {
  appendChild(node: SceneNode): void;
}
interface FrameNode extends SceneNode, ChildrenMixin {
  layoutMode: "NONE" | "HORIZONTAL" | "VERTICAL";
  itemSpacing: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  resize(width: number, height: number): void;
  fills: unknown[];
  strokes: unknown[];
  cornerRadius: number;
}
interface TextNode extends SceneNode {
  characters: string;
  fontSize: number;
}
interface ComponentNode extends SceneNode {
  createInstance(): InstanceNode;
}
interface InstanceNode extends SceneNode {}
declare const figma: {
  showUI(html: string, options: { width: number; height: number }): void;
  ui: {
    onmessage: (message: unknown) => void;
    postMessage(message: unknown): void;
  };
  createFrame(): FrameNode;
  createText(): TextNode;
  loadFontAsync(font: { family: string; style: string }): Promise<void>;
  importComponentByKeyAsync(key: string): Promise<ComponentNode>;
  currentPage: ChildrenMixin & { selection: SceneNode[] };
  viewport: { scrollAndZoomIntoView(nodes: SceneNode[]): void };
};
declare const __html__: string;
