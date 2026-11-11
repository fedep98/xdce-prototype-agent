# MVP limitations

- The checked-in catalog contains four verified components. It is intentionally not a complete inventory of `xdce-widget`.
- The ingestion parser extracts Angular selectors, `@Input`/signal input metadata, literal union options and source provenance. Complex computed types, inherited inputs, Storybook stories and runtime-only variants may require adapters.
- `NbpStyle` and `NbpSize` are imported by the verified components. Where local comments exposed example values, the catalog labels them as partial documentation hints rather than complete enums.
- The API does not include production identity, tenant registration, persistence or model orchestration.
- The Figma renderer supports layout, text, mapped native instances and labelled visual fallbacks. It does not yet map every XDCE property to Figma variant properties.
- Microsoft 365 files contain placeholder deployment URLs and no tenant/client credentials.
- Schema validation is implemented without a third-party JSON Schema engine to keep the runtime minimal. `prototype.schema.json` remains the portable canonical contract.
