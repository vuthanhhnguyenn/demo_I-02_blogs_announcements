# Specification Quality Checklist: E-02 Connected Equipment List & Search

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-07
**Updated**: 2026-09-07 — after clarification session (5 answered, 8 deferred with defaults adopted)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
      — _Exception by user direction_: §API Contract records the backend design (API-103 / API-104) because the request explicitly supplied it as the contract to build against. Requirements themselves stay behaviour-level.
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
      — Component hierarchy and API sections are annexes for implementers; Scope / User Scenarios / Requirements / Success Criteria read without them.
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
      — All 5 inline `[NEED CLARIFICATION]` markers were resolved by the 2026-09-07 clarification session; none remain in the body. Q&A rows are all struck through as either **Resolved** (user-answered) or **Deferred — recorded default adopted**.
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
      — 4 user stories, 22 acceptance scenarios.
- [x] Edge cases are identified
      — 10 edge cases, each traced to prototype behaviour or an API constraint.
- [x] Scope is clearly bounded
      — In scope: FR-001, FR-002, FR-010, FR-011 + the connected-equipment page chrome (SR-008). Every other E-02 FR is out of scope with the owning spec named. §Separation tabulates the element-by-element seam against `008-controller-management`, so the contact-control device side is excluded outright rather than partially shared.
- [x] Dependencies and assumptions identified
      — 10 assumptions; dependencies on `006`, `007`, `008`, Y-02, G-01/G-02 named.

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
      — P1 search/identify, P1 abnormal triage, P2 bulk status, P3 CSV export.
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification
      — Confined to the annex sections noted above.

## Traceability

- [x] Every connected-equipment UI element in `equipment-list.tsx` mapped to an E-02 requirement (§UI Element Traceability, 4 tables)
- [x] Contact-control device elements excluded from requirements, scenarios, success criteria and parity items (§Separation)
- [x] Column set and column order recorded as normative (12 columns)
- [x] Verbatim Japanese copy captured for labels, placeholders, tooltips, empty states and warnings
- [x] Prototype↔spec and prototype↔API mismatches enumerated (A1–A10, Q1–Q12) rather than guessed

## Notes

- **Status: Clarified.** Session 2026-09-07 resolved the five highest-impact questions; the other eight proceed on their recorded defaults. Nothing blocks `/speckit.plan`.
- **User decisions (2026-09-07)**: (1) prototype's 12 columns supersede the shipped 8, wire values per API-103; (2) 紐づき契約種別 keeps the prototype's three labels verbatim, divergence from FR-008 v2 accepted and raised as a client QA; (3) bulk dialog unchanged — textarea → `changedNote`, `changedReason` omitted, no-op devices pre-excluded; (4) selection follows the A-02 transfer pruning pattern with no cap; (5) an over-100 batch is refused whole, never chunked.
- **Highest-impact deferred item**: Q2 — 8 of 11 sortable columns are unsupported by the API `sort` enum; the adopted default keeps the affordances and mocks the unsupported keys pending a BE change.
- **Spec boundary**: per user direction the contact-control device side is specified entirely by `008-controller-management`, despite the prototype packing both lists into one file. `parity.md` holds 138 items, all connected-equipment.
- **BE-side gaps** (A1–A10) are recorded for the API report; per project convention they are mocked, not treated as blockers.
- Recommended next step: `/speckit.plan`. Re-run `/speckit.clarify` afterwards only if a deferred default proves wrong during implementation.
