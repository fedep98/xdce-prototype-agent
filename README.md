# XDCE Prototype Agent MVP

End-to-end TypeScript monorepo for a Microsoft 365 Copilot Declarative Agent that produces schema-validated page prototypes using only components verified from `XDCE0/xdce-widget@master`, plus a Figma importer.

## Quick start

Requirements: Node.js 20+ and npm 10+.

```powershell
npm install
npm run build
npm test
```

### Generate the real XDCE catalog

Start the local Navigator service, then run:

```powershell
npm run ingest:xdce
```

When a verified snapshot already exists, ingestion re-reads every provenance path, verifies selectors, extracted properties, complete enum options and outputs, then refreshes the verification timestamp. A bootstrap run discovers at least four components including button and table. It never downloads proprietary assets.

Navigator calls used by ingestion:

- `GET /health`

  ```powershell
  Invoke-RestMethod http://localhost:12345/health
  ```

- `GET /modules`

  ```powershell
  Invoke-RestMethod http://localhost:12345/modules
  ```

- `POST /bitbucket/search-code`

  ```json
  {"query":"nbp-button","project":"XDCE0","repo":"xdce-widget","ext":"ts","limit":100}
  ```

- `POST /bitbucket/files` when exposed by discovery (optional enrichment)

  ```json
  {"project":"XDCE0","repo":"xdce-widget","at":"master","path":"src/","limit":5000}
  ```

- `POST /bitbucket/file`

  ```json
  {"project":"XDCE0","repo":"xdce-widget","path":"src/base/nbp-button/nbp-button.component.ts","at":"master","maxChars":100000}
  ```

`authMode`, `configFile`, credentials and cookies are intentionally absent; Navigator resolves authentication server-side.

### Run the API/MCP service

```powershell
npm run start:mcp
```

Default endpoint: `http://127.0.0.1:3000`.

- `GET /health`
- `GET /api/components`
- `POST /api/prototypes/generate`
- `POST /api/prototypes/validate`
- `POST /mcp` for `initialize`, `tools/list`, and `tools/call`

The generator returns either `{ "status": "generated", "prototype": ... }`, structured catalog-backed questions with `status: "needs-input"`, or an explicit error. It never silently chooses required catalog options.

### Load the Figma plugin

1. Build the monorepo.
2. In Figma Desktop, import `apps/figma-plugin/manifest.json` as a development plugin.
3. Paste or load canonical JSON and optionally provide a map from catalog component IDs to Figma component keys.
4. Import. Missing mappings become yellow frames named `[FALLBACK - NOT NATIVE] ...`; they are never represented as native instances.

### Configure Microsoft 365 Copilot

1. Deploy `apps/mcp-server` behind an HTTPS endpoint reachable from Microsoft 365. The local `127.0.0.1` endpoint cannot be called by Copilot.
2. Replace `REPLACE_WITH_DEPLOYED_HOST` in `apps/m365-agent/ai-plugin.json` and `apps/m365-agent/openapi.yaml`.
3. Before production, replace the development `auth: None` configuration with the tenant-approved authentication scheme and protect the API with authorization, rate limiting and audit logging.
4. In Microsoft 365 Agents Toolkit, create or open a declarative-agent project and use the files in `apps/m365-agent` as the declarative agent, API plugin and OpenAPI definition.
5. Run the Toolkit validation, provision/package the app, then sideload it to an allowed test tenant or submit it through the tenant app catalog.
6. Open Microsoft 365 Copilot, select **XDCE Prototype Agent**, and start with “Mostra i componenti” or “Crea una pagina”. The agent will call the API and ask catalog-backed questions before returning canonical JSON.

Do not commit tenant IDs, client secrets, tokens or Navigator credentials. Tenant provisioning is deliberately outside this repository.

## Verified XDCE catalog

The checked-in snapshot is `ready` and contains four components verified from `XDCE0/xdce-widget@master`:

- `button` (`nbp-button`) with complete extracted `NbpButtonType` options.
- `table` (`nbp-table`) with complete extracted `NbpTableSelectionType` options and documented table interfaces.
- `input-text` (`nbp-input-text`) with verified visual inputs and outputs.
- `modal` (`nbp-modal`) with verified IDS/XL/popup constraints.

Every component includes source paths, branch, verification status/timestamp and evidence classification. Button style/size examples are explicitly marked as partial documentation hints because the imported `NbpStyle`/`NbpSize` enums were not part of the verified source set.

See [architecture](docs/architecture.md), [threat boundaries](docs/security.md), and [limitations](docs/limitations.md).
