# Specification Quality Checklist: Store Map Setup — Floor Plan & Locker Placement (Y-02 FR-006 / Y-02-05)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-02
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
- [x] No implementation details leak into specification

## Notes

- **Q1 resolved 2026-10-02 (iteration 2)** — the only `[NEEDS CLARIFICATION]` (FR-083, floor-plan image on the real API) was answered by the user: build the image UI now, unwired and with no mock, and integrate when the backend adds a fetchable URL (B4 / R204). FR-083 is now verifiable: the image UI behaves per V0 within the session, and no image request is sent. Every FR traces to an acceptance scenario, an edge case or a parity item; FR-007, FR-046, FR-047 and FR-052 have no V0 source and are verified against the spec (parity PAR170–PAR178).
- **Endpoint names appear in the Data FRs and in Appendix A.** As in the sibling 026 specs, this is the backend _contract_ the screen must mirror (relative `mapX`/`mapY`, full-row replace of `store_details`). It is a contract input, not a leaked implementation choice. The Content Quality items are marked passing on that convention.
- **Divergences from V0, all resolved in favour of Y-02's 権限マトリクス (L207, L215)**:
  - Staff can edit their own store only (FR-062 / PAR153).
  - Trainer and Observer have no access (FR-061 / PAR154).
  - Server-side enforcement (FR-064 / PAR155).
  - Manager stays read-only despite E-01's broader cabinet grant (FR-063, BQ4).
- **Spec-governed additions with no V0 source**: the loading and error states, partial-save and conflict handling, the guard on sidebar / header-store navigation, the per-cabinet 詳細 link, and the preservation of other `store_details` fields.
- **Backend questions BQ1–BQ6** are logged in the spec's Q&A and do not block the spec: SVG whitelist, partial update of `store_details`, batch position save, role rules on the cabinet `PATCH`, list page size, and the display-name field.
- **Coordination**: the store detail's 店舗マップ tab (the primary entry, FR-070 / FR-048) is specified in `store-detail/spec.md`, which is being updated in parallel. This spec does not restate that tab's rendering beyond the parity items for the entry point (PAR160–PAR165).
- `parity.md` holds **135 items** across 15 regions, all unticked.
