# Design

This document explains why Bread Pitt is designed the way it is, including technical and UX trade-offs.

Related docs: [architecture.md](architecture.md), [product-overview.md](product-overview.md), [security.md](security.md)

## 1) Product design principles

- Calm and practical over feature-heavy.
- Timeline-first experience for process tracking.
- “Low cognitive load” language for everyday baking decisions.
- Single-user clarity over multi-tenant complexity.
- Optional integrations that do not block core product usage.

## 2) Technical design principles

- Keep the stack small and understandable.
- Prefer deterministic domain logic over hidden background magic.
- Persist operationally important state (no fragile in-memory queues).
- Choose boring infrastructure defaults for self-hosting.
- Keep boundaries clear: route/action/UI in `app`, domain logic in `lib`.

## 3) Why a monolith

Bread Pitt is implemented as one Next.js app instead of multiple services.

Why this is good here:

- one deployable artifact for hobby/self-hosted environments
- local setup is straightforward for junior engineers
- fewer cross-service failures and fewer credentials to manage
- reduced operational overhead for backups and migrations

Trade-off:

- less horizontal scaling flexibility than decomposed services

Given single-user target usage, this is acceptable.

## 4) Data design philosophy

The app stores behavioral state directly in SQLite tables.

Key idea: steps and reminders are fully materialized when a process starts.

Benefits:

- timeline is explicit and inspectable
- scheduler can recover after restart
- operational debugging is easier (read table rows directly)

Trade-off:

- template changes do not automatically mutate already-started processes

## 5) Process design choices

### Template-driven process creation

Templates in `lib/processes/templates` produce all steps/reminders up front.

Benefits:

- deterministic process creation
- easier reasoning about “what will happen next”
- clear separation between recipe logic and orchestration

### Lifecycle behavior

- pause: cancel pending reminders
- resume: shift incomplete steps and reminders by paused duration
- restart: archive old run and start new run
- abandon: mark run abandoned, cancel reminders

This behavior favors user predictability and historical traceability.

## 6) UX design choices

### Dashboard as “today control center”

The `/` route surfaces:

- immediate due action
- next countdown
- quick actions
- next 24-hour timeline

This minimizes navigation for daily use.

### Journal as historical memory

The `/journal` area preserves previous process runs with observations and statuses.

Reason: baking quality improves with historical context and pattern comparison.

### Library/troubleshoot as embedded knowledge

Guide and troubleshooting content is in-app instead of external docs.

Reason: reduces context switching and keeps guidance synchronized with product terminology.

## 7) Integration design decisions

### Telegram is notification-first

Telegram is optional but primary for reminders and quick commands.

Why:

- high delivery reliability for personal workflow
- fast interaction from mobile lock screen/chat context

Fallback:

- if unpaired, core app still works through web UI

### Google Calendar is optional mirror, not source of truth

Calendar events reflect process state but do not drive process state.

Why:

- avoids sync conflicts
- preserves single source of truth in SQLite

## 8) Security and trust assumptions

- single trusted account model
- deployment owner controls environment and host
- external risk surface: webhook/OAuth tokens and public endpoint exposure

Important known gap:

- Google tokens are stored plaintext in DB currently; see [security.md](security.md) for mitigation strategy.

## 9) Accessibility and readability design

Documentation and UI copy target junior engineers and non-expert bakers:

- plain language in error messages and labels
- small, descriptive command sets
- explicit sectioning across docs

## 10) Future-facing design opportunities

- encrypt OAuth tokens at rest
- unify environment-variable behavior (`DATABASE_URL` vs fixed DB path)
- add automated tests for critical process/scheduler flows
- add structured observability for production operations

## 11) Verification checklist

- Start each process type and confirm timeline generation is intuitive.
- Pause/resume and verify shifted schedule behavior in UI and DB.
- Run without Telegram env vars and confirm core app remains usable.
- Connect Google and verify event upsert/cancel tracks lifecycle actions.

