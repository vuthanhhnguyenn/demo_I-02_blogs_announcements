# Specification Quality Checklist: Member Detail — Header Popups & Side Sheets

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-29
**Feature**: [spec.md](../spec.md)

> **Amended 2026-09-18 — surface 11 (再入会) withdrawn.** The prototype removed the action on
> 2026-09-16 (`a7d0c88`); re-enrollment belongs to the `C-01` enrollment application
> (`POST /api/v1/admin/applications`), and its fee waiver is decided server-side. Everything
> below about 再入会 is kept as a record and no longer describes the screen — see
> [spec.md](../spec.md#amendment-2026-09-18--surface-11-再入会-withdrawn).

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

- The user's request explicitly asked for `[NEED CLARIFICATION]` findings to be consolidated into a **Q&A / Clarification Needed** section at the bottom of the spec rather than inlined as markers. That section originally held 7 questions; no inline markers were ever placed in the requirement text.
- **Clarification session 2026-07-29 (`/speckit.clarify`)**: 5 of 7 questions asked and answered — Q1 強制退会 scope, Q4 gate-stop data model, Q2 再入会 integration, Q3 休会解除 lifecycle, Q5 退会理由 vocabulary. All five are recorded under `## Clarifications` and folded into the affected requirements. Q6 (penalty-release ownership) and Q7 (PII typed confirmation) are deferred — each already has a defensible default in the requirements and neither changes scope or data modelling.
- One clarification **changed the target away from the current code**: Q5 removes the project's 6-value 退会理由 enum in favour of the prototype's single free-text field. Tracked as gap G-F.
- The spec deliberately carries two sections that are not in the template — **API Contract Mapping** and **Gap Analysis**. Both are inputs the user asked for (map the API design doc onto the project; check what already exists and needs updating). They name endpoints and payload fields, which is a controlled exception to "no implementation details": without the field-level comparison the mismatches (G-01…G-13) cannot be stated at all.
- All 12 surfaces already exist in the codebase. The functional requirements therefore describe the **target** behaviour, and the Gap Analysis is the actual work list (G-A…G-F prototype gaps, G-01…G-13 API-contract gaps).
- Four backend endpoints are formally requested as a dependency of this feature: 休会解除, 予約ペナルティ解除, 再入会, 強制退会. Mock routes stand in meanwhile, so the feature is not blocked on them.
- Ready for `/speckit.plan`.
