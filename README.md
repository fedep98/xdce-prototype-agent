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

The ingestion fails without overwriting the snapshot unless it verifies at least four components, including button and table. It records repository, path and branch provenance and never downloads proprietary assets.

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

- `POST /bitbucket/files`

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

Replace `REPLACE_WITH_DEPLOYED_HOST` in `apps/m365-agent/ai-plugin.json` and `openapi.yaml` with the secured API host, then package/deploy through the Microsoft 365 Agents Toolkit for the target tenant. Add platform authentication at deployment time; do not commit tenant IDs, client secrets or tokens.

## Current XDCE detection status

No XDCE component is claimed as detected in this commit. Navigator access from the implementation session was blocked by unavailable interactive execution approval, so `packages/xdce-catalog/catalog/xdce-widget.snapshot.json` is deliberately empty with `status: "blocked"`. Running `npm run ingest:xdce` locally is the required step that will populate verified button, table and at least two additional components.

See [architecture](docs/architecture.md), [threat boundaries](docs/security.md), and [limitations](docs/limitations.md).
