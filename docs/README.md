# Bread Pitt Documentation

This folder is the canonical technical documentation for the Bread Pitt application.

Bread Pitt is a single-user, self-hosted sourdough companion built with Next.js, SQLite, and Telegram/Google integrations.

## Who should read what

- Product owner or new teammate: start with [product-overview.md](product-overview.md)
- Junior engineer onboarding to the codebase: read [architecture.md](architecture.md), then [developer-guide.md](developer-guide.md)
- Operator responsible for deployment/runtime: read [operations-runbook.md](operations-runbook.md) and [security.md](security.md)
- End user (baker): read [user-manual.md](user-manual.md)

## Documentation map

- [architecture.md](architecture.md): system components, boundaries, and runtime data flows
- [design.md](design.md): design principles, product decisions, and trade-offs
- [product-overview.md](product-overview.md): personas, feature inventory, and route-level behavior
- [user-manual.md](user-manual.md): day-to-day product usage instructions
- [developer-guide.md](developer-guide.md): local setup, workflows, scripts, and implementation guidance
- [api-and-actions.md](api-and-actions.md): API route and server action behavior
- [data-model.md](data-model.md): schema entities, table responsibilities, and lifecycle states
- [integrations.md](integrations.md): Telegram and Google Calendar architecture and setup
- [operations-runbook.md](operations-runbook.md): deployment, backups, health checks, and incidents
- [security.md](security.md): threat model, secret handling, auth controls, and hardening
- [troubleshooting.md](troubleshooting.md): symptom-based debugging playbooks
- [glossary.md](glossary.md): shared terms and definitions
- [changelog-docs.md](changelog-docs.md): documentation update history

## Recommended reading paths

### Path A: New engineer (first week)

1. [product-overview.md](product-overview.md)
2. [architecture.md](architecture.md)
3. [data-model.md](data-model.md)
4. [developer-guide.md](developer-guide.md)
5. [api-and-actions.md](api-and-actions.md)

### Path B: Operations owner

1. [architecture.md](architecture.md)
2. [operations-runbook.md](operations-runbook.md)
3. [security.md](security.md)
4. [troubleshooting.md](troubleshooting.md)

### Path C: Power user / support

1. [user-manual.md](user-manual.md)
2. [integrations.md](integrations.md)
3. [troubleshooting.md](troubleshooting.md)

## Documentation conventions

- Commands are shown as runnable snippets and should include expected outcomes.
- Every major section answers: what it is, why it matters, and how to verify.
- File paths in docs reference actual repository locations.
- Integration steps clearly separate required and optional configuration.

## Scope note

This documentation describes the code and behavior currently present in the repository. If implementation changes, update the relevant files in this folder in the same pull request.
