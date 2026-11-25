# Specification Quality Checklist: Campaign Management Refactor (G-03)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-27
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [ ] No implementation details leak into specification

## Validation history

| Iteration | Date       | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | 2026-07-27 | 16/17 pass. Three scope-affecting decisions collected in an Open Questions section rather than as inline markers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2         | 2026-07-27 | All three resolved in clarification session 2026-07-27. Open Questions section removed; decisions recorded under Clarifications; FR-000, FR-009a and requirements group D (FR-030 – FR-035) added; SC-009 and SC-010 added; the in-use-campaign edge case rewritten from a forward reference to concrete behaviour. 16/17 pass — the one open item is the standing qualification below, not a defect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 3         | 2026-07-27 | Reconciled against the built code before test planning. FR-000, FR-004, FR-008, FR-023, FR-027, FR-030 and FR-035 corrected where the specification, not the code, was wrong; FR-036 added from `G-06`'s issuer/scope-type table; five edge cases and three assumptions added; the include-deleted assumption removed as unbuilt. Five code-vs-spec defects were **not** absorbed into this document — the requirements/acceptance scenarios were left describing the intended behaviour so a black-box test pass reports them as findings. 16/17 pass, unchanged.                                                                                                                                                                                                                                                                                                                            |
| 4         | 2026-07-27 | Of the five defects from iteration 3, three were fixed in code and confirmed live (sort-by-id, the promo-code scope-type role restriction, the campaign-form unsaved-changes guard); the CSV-export restriction was resolved by correcting `FR-027` itself (no code change — `G-06` never restricted it). The store-usage-card visibility fix (US2 AS-3/AS-4) was reverted: its role/default-state behaviour turned out to depend on how a session's current-store selection is initialised, which differs between this app's existing store-switcher convention and the prototype's own demo-user mock, and that difference was not resolved before the code changed. The requirement text is unchanged and still describes the card as absent for an all-stores session — this is intentionally left as an open gap for the test pass to surface, not silently matched to the current code. |

## Notes

### On "No implementation details" (Content Quality — passed with qualification)

The user's request is itself an API-contract redesign ("thiết kế lại api giống ở backend-api"). Requirements group **A. Contract realignment** (FR-001 – FR-009) therefore describes data-contract semantics — field presence, nullability, cardinality, vocabulary — because that _is_ the deliverable, not an implementation choice made on the user's behalf. No language, framework, library or file-layout decision appears anywhere in the spec.

The Feature Readiness item is left unchecked to keep this qualification visible rather than silently absorbed: a reviewer who expects a pure behaviour spec should read group A knowing it is intentionally contract-level.

### On "No [NEEDS CLARIFICATION] markers remain" (passed)

No inline markers were used. The three scope-affecting decisions were raised as explicit questions and answered in clarification session 2026-07-27:

| Decision                 | Resolution                                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API-mirroring fidelity   | Backend field set and semantics, expressed in repository conventions — `camelCase` on the wire (as `API-088` has it), `snake_case` only on the internal DB row, readable identifiers, existing pagination envelope |
| In-use edit guard        | Warn in the interface (prototype form unchanged), enforce in the API on submit                                                                                                                                     |
| Promotion-code tab scope | Full rebuild against the real `Promotion_Code_Management` contract                                                                                                                                                 |

Every other ambiguity was resolved with a documented assumption. Nothing now gates `/speckit.plan`.

### Deliberate contract deviations to carry into planning

Requirements group **B** (FR-010 – FR-018) defines nine fields the prototype needs that `API-088` does not carry. Each must be tagged as a mock-ahead-of-backend extension at its point of definition, following the precedent set by `017-crm-maintenance-management`.

Requirement **FR-000** turned out to add almost no deviation of its own: the wire format keeps the contract's `camelCase` names verbatim, so only the identifiers (`CP001` instead of a UUID) and the pagination envelope differ. Every mock-ahead field must still be tagged at its point of definition, naming the requirement that introduced it, so the future alignment is mechanical.
