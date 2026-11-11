import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestCatalog, verifyCatalogSnapshot } from "./navigator.js";
import type { XdceCatalog } from "./types.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(packageRoot, "catalog", "xdce-widget.snapshot.json");

try {
  let catalog: XdceCatalog;
  try {
    const existing = JSON.parse(await readFile(output, "utf8")) as XdceCatalog;
    catalog = existing.status === "ready" && existing.components.length > 0
      ? await verifyCatalogSnapshot(existing)
      : await ingestCatalog();
  } catch (error) {
    if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === "ENOENT") {
      catalog = await ingestCatalog();
    } else {
      throw error;
    }
  }
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(`Wrote ${catalog.components.length} verified components to ${output}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
