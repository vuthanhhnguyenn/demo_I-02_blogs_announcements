# Specification Quality Checklist: Member Detail — The 10 Tabs

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-29
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
      _Note: the API Contract Mapping and Gap Analysis sections do name endpoints and field shapes. That is deliberate and requested by the user ("dùng thông tin thiết kế API để tạo API trong dự án này") — the requirement statements (FR-001…FR-047) themselves stay implementation-free._
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders (User Scenarios, Requirements, Success Criteria)
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEED CLARIFICATION] markers remain
      _All 8 resolved on 2026-07-29: Q1, Q2, Q3, Q4, Q8 in the clarification session; Q5 (design-only — build the mocks), Q6 (follow the prototype — refund stays in 休会申請), Q7 (the prototype wins — relabel レッスン状態) immediately before implementation. Every answer is encoded in the requirements and the Gap Analysis._
- [x] Requirements are testable and unambiguous (each FR names the visible fields, filters, or blocking conditions)
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic
- [x] All acceptance scenarios are defined (4 user stories, 23 scenarios)
- [x] Edge cases are identified (9)
- [x] Scope is clearly bounded (Overview + Out of Scope for Phase 1, 11 exclusions)
- [x] Dependencies and assumptions identified (9 assumptions; feature `021` boundary stated)

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows (read all tabs, contract operations, privacy-gated data, audit)
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into the requirement statements

## Grounding

- [x] Every tab traced to `A-01` (or an explicitly named out-of-document source: `G-04` for アンケート回答)
- [x] Every prototype card mapped to an FR in the Traceability table
- [x] Every project mock route mapped against the API design doc (27 rows)
- [x] No invented features: nothing appears in the requirements that is absent from both `A-01` and `member-detail.tsx`
- [x] No omitted features: all 10 prototype tabs and all their cards are covered

## Notes

- The spec is a **verify-and-update** pass: all 10 tabs already exist in the project. 11 prototype/requirement gaps (P-01…P-11) and 22 API-contract gaps (G-01…G-22) are recorded rather than silently accepted.
- Clarification session 2026-07-29 resolved Q8 (主契約変更 = pending application → new **FR-013a**), Q3 (survey tab keeps scope; member-scoped endpoint requested), Q1 (通知受信設定 card kept; member-scoped endpoint requested), Q4 (three consent states confirmed; explicit consent status requested) and Q2 (one server-derived billing badge).
- Four backend requests followed from those answers; the first was withdrawn 2026-09-09 (see spec.md FR-013a): ~~a cancel endpoint for a pending plan-change~~, `GET /admin/members/{memberId}/questionnaire-responses`, a member-scoped notification opt-in read, and an explicit body-data consent status — plus the server-side billing-status derivation rule.
- Q5, Q6 and Q7 were answered on 2026-07-29 before implementation: **Q5** member-history endpoints are design-only → Phase 1 runs on mocks and any missing mock route is created here; **Q6** follow the prototype → the point refund stays in the 休会申請 sheet, both tabs read-only; **Q7** the prototype wins → レッスン状態 relabelled to 受講済み / キャンセル / 予約中 (欠席 kept for `absent`), training-records empty message unchanged. Tasks T014/T015 were updated accordingly.
- Checklist is complete — the `/speckit.implement` gate passes.
