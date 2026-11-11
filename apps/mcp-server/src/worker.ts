import { CatalogStore, type XdceCatalog } from "@xdce/catalog";
import catalog from "../../../packages/xdce-catalog/catalog/xdce-widget.snapshot.json" with { type: "json" };
import { createRequestHandler } from "./handler.js";

const handleRequest = createRequestHandler(new CatalogStore(catalog as XdceCatalog));

export default {
  fetch(request: Request): Promise<Response> {
    return handleRequest(request);
  }
};
