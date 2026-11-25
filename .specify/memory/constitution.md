<!--
SYNC IMPACT REPORT
Version change: (template) → 1.0.0
Modified principles: N/A — initial fill from template
Added sections: Core Principles (I–V), No Testing Policy, Technology Stack, Governance
Removed sections: N/A
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Testing field removed; Constitution Check notes updated
  ✅ .specify/templates/tasks-template.md — Test task blocks removed from all phases
  ✅ .specify/templates/spec-template.md — "User Scenarios & Testing" heading updated
Deferred TODOs: None
-->

# Fitness CRM Constitution

## Core Principles

### I. TypeScript Strictness

All code MUST use TypeScript 5.x with `strict: true` and `no-explicit-any` enforced via ESLint.
Types MUST be derived from domain models or OpenAPI-generated clients — no inline `any`, no
unnarrowed `unknown`. Functions MUST be small, single-purpose, and named to reveal intent.
Import order MUST follow Prettier's sort-imports config already in the project.

**Rationale**: Type safety is the primary defence against runtime bugs in a CRM where data
integrity is critical. Readable, consistent code reduces onboarding friction and review time.

### II. OpenAPI-First

All API interactions MUST use the `hey-api`-generated client under `src/lib/api/`. Manual edits to
generated files are FORBIDDEN. Phase 1 development uses the in-memory mock DB at
`src/app/api/_mock-db/`; Phase 2 switches to the generated REST client with zero
application-code changes. New endpoints MUST be declared in the OpenAPI spec before
implementation begins.

**Rationale**: A single source of truth for the API contract prevents drift between frontend
and backend and makes the Phase 1 → Phase 2 migration mechanical rather than error-prone.

### III. Spec-Driven Development

No implementation task MAY begin before the feature's `spec.md` is approved and all
`[NEEDS CLARIFICATION]` tokens are resolved. `plan.md` MUST exist before `tasks.md` is
generated. All generated artifacts (spec, plan, tasks, data-model, contracts) MUST live under
`specs/<feature>/` as the single source of truth.

**Rationale**: Front-loading clarity eliminates scope creep and rework — the leading cause
of schedule overrun in CRM feature development.

### IV. App Router Conventions & Simple UX

Components MUST default to React Server Components; `"use client"` MUST be justified in a
comment. Route-local code lives in `_components/`, `_hooks/`, `_contexts/` co-located with
the page. UI MUST be built exclusively with shadcn/ui (Radix primitives) + Tailwind CSS v4 —
no additional CSS libraries, no inline `style={}` except for dynamic values. Forms MUST use
`react-hook-form` + Zod. Icons MUST come from `lucide-react`. UX flows MUST take the shortest
path to the user's goal: no unnecessary modals, no multi-step wizards where a single form
suffices, no decorative UI that adds no information.

**Rationale**: Consistent use of the approved component system produces a coherent UI without
per-developer style variation, while RSC-first keeps client bundle size minimal.

### V. Simplicity & Minimal Dependencies

New npm dependencies MUST NOT be added without explicit justification and team consensus.
The approved stack (see Technology Stack) is sufficient for all Phase 1 and Phase 2 work.
YAGNI applies: implement only what the current spec requires. No utility libraries, state
managers, or abstraction layers beyond what already exists in the project.

**Rationale**: Each additional dependency is a maintenance obligation, a potential security
surface, and a cognitive load increase. The existing stack covers all foreseeable CRM needs.

## No Testing Policy

**This project operates WITHOUT any automated tests. This rule is absolute and non-negotiable.**

- Unit tests MUST NOT be written or committed.
- Integration tests MUST NOT be written or committed.
- End-to-end (e2e) tests MUST NOT be written or committed.
- Test frameworks (Jest, Vitest, Playwright, Cypress, etc.) MUST NOT be installed.
- Task lists MUST NOT include test-writing tasks.
- `spec.md` acceptance scenarios are human-readable behaviour descriptions only — they are
  NOT translated into automated test code.

Quality assurance is performed through:

1. TypeScript strict-mode compilation (`tsc --noEmit`) — catches type errors at build time.
2. ESLint + Prettier — enforces code quality and formatting on every commit via husky/lint-staged.
3. Manual verification against the quickstart checklist in `specs/<feature>/quickstart.md`.
4. Code review via Merge Request before merging to `dev`.

## Technology Stack

Approved technologies (additions require a constitution amendment):

| Layer         | Technology                  | Version      |
| ------------- | --------------------------- | ------------ |
| Language      | TypeScript                  | 5.x (strict) |
| Runtime       | Node.js                     | ≥ 24.0.0     |
| Framework     | Next.js (App Router)        | 16           |
| UI Components | shadcn/ui (Radix)           | latest       |
| Styling       | Tailwind CSS                | v4           |
| Data Fetching | TanStack React Query        | 5            |
| Forms         | react-hook-form + Zod       | latest       |
| Icons         | lucide-react                | latest       |
| API Client    | hey-api (OpenAPI generated) | latest       |
| Date Handling | date-fns                    | v4           |
| URL State     | nuqs                        | latest       |
| Linter        | ESLint (eslint-config-next) | current      |
| Formatter     | Prettier                    | current      |

## Governance

This constitution supersedes all other documents and prior practices.

**Amendment procedure**: Any amendment MUST be proposed as a PR to `dev`, reference the
specific principle being changed, increment the version per semver rules, and receive at
least one approval from a team lead.

**Versioning policy**:

- MAJOR: A principle is removed or its non-negotiable rules are redefined.
- MINOR: A new principle or section is added, or material guidance is expanded.
- PATCH: Wording clarifications, typo fixes, or non-semantic refinements.

**Compliance review**: Every PR description MUST include a Constitution Check table (as
defined in `plan-template.md`). Non-compliant PRs MUST be rejected until violations are
resolved or formally waived via a MINOR amendment.

**Version**: 1.0.0 | **Ratified**: 2026-07-03 | **Last Amended**: 2026-07-03
