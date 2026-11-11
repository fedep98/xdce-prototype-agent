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

### Deploy free on Cloudflare Workers

The same API is available through a Worker-compatible `fetch()` handler. The verified catalog is bundled at deploy time, so no database or persistent filesystem is required.

```powershell
npm install
npm test
npx wrangler login
npm run worker:deploy
```

Cloudflare returns an HTTPS URL similar to:

```text
https://xdce-prototype-api.<account-subdomain>.workers.dev
```

Verify the deployment:

```powershell
$apiHost = 'https://xdce-prototype-api.<account-subdomain>.workers.dev'
Invoke-RestMethod "$apiHost/health"
Invoke-RestMethod "$apiHost/api/components"
Invoke-WebRequest "$apiHost/openapi.yaml"
```

The Worker serves a deployment-specific OpenAPI document at `/openapi.yaml`, so the Microsoft 365 API plugin can use:

```json
"spec": {
  "url": "https://xdce-prototype-api.<account-subdomain>.workers.dev/openapi.yaml"
}
```

Cloudflare Workers Free currently allows limited daily usage and has a short CPU-time allowance per invocation. This stateless MVP stays within that model for ordinary catalog and prototype requests. Review the current Cloudflare limits before production use.

### Load the Figma plugin

1. Build the monorepo.
2. In Figma Desktop, import `apps/figma-plugin/manifest.json` as a development plugin.
3. Paste or load canonical JSON and optionally provide a map from catalog component IDs to Figma component keys.
4. Import. Missing mappings become yellow frames named `[FALLBACK - NOT NATIVE] ...`; they are never represented as native instances.

### Configure Microsoft 365 Copilot

`apps/m365-agent` is a complete Microsoft 365 Agents Toolkit project using the current Microsoft schemas: app manifest 1.30, declarative agent 1.9 and plugin 2.4.

1. Deploy the Cloudflare Worker and copy its `https://...workers.dev` URL.
2. Set `API_BASE_URL` in `apps/m365-agent/env/.env.dev` to that URL. Do not add a trailing slash.
3. Install the **Microsoft 365 Agents Toolkit** extension in VS Code.
4. Open `apps/m365-agent` as the VS Code workspace folder.
5. In Agents Toolkit, sign in to a Microsoft 365 tenant with custom app upload enabled and a Microsoft 365 Copilot license or metered access.
6. Select **Lifecycle > Provision** and choose the `dev` environment. The workflow creates the app registration in the Developer Portal, builds and validates the package, updates it, and publishes the agent with user scope.
7. Open [Microsoft 365 Copilot](https://m365.cloud.microsoft/chat), open the agents drawer and select **XDCE Prototype Agent Dev**.
8. Test “Mostra i componenti” and “Crea una pagina di ricerca con input, pulsante e tabella”.

The generated development package is written to:

```text
apps/m365-agent/appPackage/build/appPackage.dev.zip
```

For tenant-wide publication, run **Lifecycle > Publish** after validation and administrator approval. The publish workflow uses tenant scope.

The API plugin currently uses `auth: None` for an MVP. Before production, add tenant-approved authentication and protect the API with authorization, rate limiting and audit logging. Never commit tenant IDs, client secrets, Cloudflare tokens or Navigator credentials.

## Verified XDCE catalog

The checked-in snapshot is `ready` and contains four components verified from `XDCE0/xdce-widget@master`:

- `button` (`nbp-button`) with complete extracted `NbpButtonType` options.
- `table` (`nbp-table`) with complete extracted `NbpTableSelectionType` options and documented table interfaces.
- `input-text` (`nbp-input-text`) with verified visual inputs and outputs.
- `modal` (`nbp-modal`) with verified IDS/XL/popup constraints.

Every component includes source paths, branch, verification status/timestamp and evidence classification. Button style/size examples are explicitly marked as partial documentation hints because the imported `NbpStyle`/`NbpSize` enums were not part of the verified source set.

See [architecture](docs/architecture.md), [Microsoft 365 agent setup](docs/m365-agent-setup.md), [threat boundaries](docs/security.md), and [limitations](docs/limitations.md).
