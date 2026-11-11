# MVP limitations

- The implementation session could not execute local HTTP or shell commands because interactive approval was unavailable. The checked-in snapshot is therefore intentionally `blocked` and contains no invented XDCE components.
- The ingestion parser extracts Angular selectors, `@Input`/signal input metadata, literal union options and source provenance. Complex computed types, inherited inputs, Storybook stories and runtime-only variants may require adapters.
- The API does not include production identity, tenant registration, persistence or model orchestration.
- The Figma renderer supports layout, text, mapped native instances and labelled visual fallbacks. It does not yet map every XDCE property to Figma variant properties.
- Microsoft 365 files contain placeholder deployment URLs and no tenant/client credentials.
- Schema validation is implemented without a third-party JSON Schema engine to keep the runtime minimal. `prototype.schema.json` remains the portable canonical contract.
