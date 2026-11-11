# Microsoft 365 Copilot agent setup

The repository contains a complete Microsoft 365 Agents Toolkit project in `apps/m365-agent`.

## What is already implemented

- Microsoft 365 app manifest schema 1.30.
- Declarative agent schema 1.9.
- API plugin schema 2.4.
- OpenAPI action definitions for listing components, generating prototypes and validating JSON.
- Agent instructions that prohibit invented XDCE metadata and require structured clarification.
- Required 192x192 color and 32x32 outline icons.
- Agents Toolkit lifecycle workflows for user-scoped provisioning and tenant publication.

## 1. Deploy the API

From the repository root:

```powershell
npm install
npm test
npx wrangler login
npm run worker:deploy
```

Copy the resulting URL:

```text
https://xdce-prototype-api.<account-subdomain>.workers.dev
```

Verify:

```powershell
$apiHost = 'https://xdce-prototype-api.<account-subdomain>.workers.dev'
Invoke-RestMethod "$apiHost/health"
Invoke-RestMethod "$apiHost/api/components"
Invoke-WebRequest "$apiHost/openapi.yaml"
```

## 2. Configure the agent endpoint

Edit `apps/m365-agent/env/.env.dev`:

```dotenv
APP_NAME_SUFFIX= Dev
API_BASE_URL=https://xdce-prototype-api.<account-subdomain>.workers.dev
```

Do not add a trailing slash.

## 3. Provision the development agent

1. Install the Microsoft 365 Agents Toolkit extension in VS Code.
2. Open `apps/m365-agent` as the workspace folder.
3. In the Toolkit sidebar, sign in to Microsoft 365.
4. Confirm the tenant permits custom app upload and that your account has Microsoft 365 Copilot or metered agent access.
5. Select **Lifecycle > Provision**.
6. Select the `dev` environment and approve the requested tenant operations.

The workflow:

1. Creates the Microsoft 365 app in Developer Portal.
2. Writes its ID to the local environment.
3. builds `appPackage/build/appPackage.dev.zip`;
4. validates the package;
5. updates the app definition;
6. publishes the declarative agent with personal scope.

## 4. Test in Microsoft 365 Copilot

Open [Microsoft 365 Copilot](https://m365.cloud.microsoft/chat), open the agents drawer and select **XDCE Prototype Agent Dev**.

Suggested tests:

```text
Mostra i componenti XDCE disponibili.
```

```text
Crea una pagina di ricerca clienti con input, pulsante e tabella.
```

The agent must ask catalog-backed questions such as button type and table selection type before returning validated canonical JSON.

## 5. Publish to the tenant

After development validation and administrator approval, select **Lifecycle > Publish**. The workflow rebuilds and validates the package, updates the Developer Portal app and publishes it with tenant scope.

Tenant publication can require administrator approval in Microsoft 365 Admin Center under **Settings > Integrated apps**.

## Security before production

The MVP plugin uses anonymous API access (`auth: None`). Before organizational production use:

- configure Microsoft Entra ID or another tenant-approved authentication mechanism;
- restrict API access to authorized users or applications;
- add rate limiting and audit logging;
- maintain the Cloudflare token only as a local or CI secret;
- never expose Navigator credentials or commit tenant/client secrets.
