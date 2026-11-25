# Specification Quality Checklist: Leave & Withdrawal Management (A-03)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-05
**Feature**: [spec.md](../spec.md)

## Content Quality

- [ ] No implementation details (languages, frameworks, APIs) — **deliberate deviation, see Note 1**
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders — with the exception noted in Note 1
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — **all 15 Q&A entries closed as of 2026-08-05; zero inline tags remain**
- [x] Requirements are testable and unambiguous — no clarification tags remain
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined — 31 scenarios across 3 user stories
- [x] Edge cases are identified — 8 cases
- [x] Scope is clearly bounded — explicit In Scope / Out of Scope for Phase 1 table
- [x] Dependencies and assumptions identified — 10 assumptions

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [ ] No implementation details leak into specification — **same as Note 1**

## Notes

**Status as of 2026-08-05 (post-`/speckit.plan`)**: all Requirement Completeness items now pass — every clarification is closed and no tags remain. **One** item stays unchecked (Note 1), and it is a direct consequence of an explicit instruction in the feature request, not an oversight. It should not be "fixed" by editing the spec without first reversing that instruction. Note 2 is retained as a record of how the clarification round was run.

### Note 1 — API contract detail is present by request

The request states: _"Đây là thông tin thiết kế API, dùng thông tin thiết kế API để tạo API trong dự án này"_ — the backend API design is a required input, and the resulting endpoint/field mapping has to be carried into the spec so `/speckit.plan` can build against it.

The technical content is quarantined into a single clearly-labelled subsection, **Backend API Contract Mapping**, plus the `Refs:` lines inside the Q&A section. Everything above it — user stories, acceptance scenarios, the FR list, success criteria — is written in business language and reads standalone. A non-technical stakeholder can skip that one subsection without losing anything.

If a strictly implementation-free spec is wanted, the mapping should be moved to `contracts/` during `/speckit.plan` (the sibling feature `017-crm-maintenance-management` uses that layout), not deleted.

### Note 2 — Clarification markers are present by request

The request states: _"Mark those specific parts with a [NEED CLARIFICATION] tag within the text. Consolidate all these points into a dedicated 'Q&A / Clarification Needed' section at the very bottom of the generated spec.md so it can be seamlessly processed in the next step (speckit.clarify)."_

This overrides the default flow of asking up to three questions inline and blocking. Fifteen genuine discrepancies were found between the source requirement, the V0 prototype, and the backend contract; the request directs all of them to `/speckit.clarify` rather than to a mid-generation Q&A round. The remaining inline tags use the requester's spelling `[NEED CLARIFICATION: …]`, each cross-referencing a `Q-nn` entry in the bottom section. They are real open questions and must be closed before `/speckit.plan`.

**Ranked by impact** (scope > rule > data > UX), for `/speckit.clarify` ordering:

| Rank | Q    | Impact | Status                                                                                                           | Why it matters                                                                                                                                                                                  |
| ---- | ---- | ------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Q-10 | Scope  | **Resolved 2026-08-05** — dropped from the list, detail-only                                                     | Whether 処理完了 is a fifth list state decided a filter option, a badge, seed data, and a possible API change                                                                                   |
| 2    | Q-11 | Scope  | **Resolved 2026-08-05** — deferred out of Phase 1                                                                | 月別ビュー was a whole second view mode with no source requirement and no backend shape                                                                                                         |
| 3    | Q-03 | Scope  | **Resolved 2026-08-05** — follow the prototype (2 / 3 steps, no highlight); highlight deferred pending UI design | Suspension timeline: 2 steps built vs. 4 in the contract, plus the `current` highlight the source spec mandates. **Leaves A-03 L144 unmet in Phase 1** — tracked as a known gap in Out of Scope |
| 4    | Q-14 | Scope  | **Resolved 2026-08-05** — map entry is stale, no tab, `statusHistories` unused                                   | Whether a 変更履歴 tab returns                                                                                                                                                                  |
| 5    | Q-05 | Scope  | **Resolved 2026-08-05** — keep it, request a server-side search param (mock first)                               | The search box has no backend support; page-local search would silently miss rows                                                                                                               |
| 6    | Q-01 | Rule   | **Resolved 2026-08-05** — keep the four presets, wire them to `scheduledFrom`/`scheduledTo`                      | The 予定日 filter was inert in the prototype and the wrong shape versus both the source spec and the API                                                                                        |
| 7    | Q-02 | Rule   | **Moot 2026-08-05** — consumed by Q-11                                                                           | Withdrawals could never render in the monthly view as written                                                                                                                                   |
| 8    | Q-08 | Rule   | **Resolved 2026-08-05 by inference** — confirm must cancel; wording left per screen                              | The detail cancel dialog performed no action                                                                                                                                                    |
| 9    | Q-06 | Rule   | **Resolved 2026-08-05 (`/speckit.plan`)** — 25/50/100, default 25                                                | Page size 200 is rejected by the project's own Zod schema (`limit` max 100), not just the real API                                                                                              |
| 10   | Q-04 | Data   | **Resolved 2026-08-05** — expose all five brands, match on the record's brand value                              | Brand filter: 2 UI options vs. 5 backend brands, matched on store-name prefix                                                                                                                   |
| 11   | Q-07 | Data   | **Resolved 2026-08-05** — fix 退会手数料, keep 未消化レッスン on both types (mock first)                         | 未消化レッスン absent from the suspension detail; 退会手数料 hardcoded to a dash                                                                                                                |
| 12   | Q-12 | Data   | **Resolved 2026-08-05** — dropped from A-03; belongs to A-01-01 (A-01 FR-006)                                    | 個別会費調整中 has no A-03 requirement and no field on any A-03 response                                                                                                                        |
| 13   | Q-15 | Data   | **Resolved 2026-08-05** — member number / application number; expanded member block inlined (mock first)         | Identifier formats disagreed, and the head-up card needs four fields no A-03 response carries                                                                                                   |
| 14   | Q-09 | UX     | **Resolved 2026-08-05 by existing project convention** — `DataStateBoundary` + `toast.error`                     | No loading or error treatment exists to copy from the prototype                                                                                                                                 |
| 15   | Q-13 | UX     | **Resolved 2026-08-05 (`/speckit.plan`) — answer REVERSED** — keep the sorting already implemented               | V0 has no sort controls, but the shipped screen does; removing it would be a regression                                                                                                         |

### Validation history

- **Iteration 1 (2026-08-05, `/speckit.specify`)**: All Requirement Completeness and Feature Readiness items pass on substance. The two unchecked items above are the documented deviations; no spec edits were made to force them green, because doing so would contradict the feature request.
- **Iteration 2 (2026-08-05, `/speckit.clarify`)**: five questions asked and answered — Q-11, Q-10, Q-03, Q-01, Q-04 — which also mooted Q-02. Six of the fifteen Q&A entries are now closed; nine remain open for a later pass.

  | Q    | Decision                                                                                                                                              |
  | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Q-11 | 月別ビュー deferred out of Phase 1 (list view only, no toggle)                                                                                        |
  | Q-10 | 処理完了 dropped from the list; remains a detail-screen state                                                                                         |
  | Q-03 | Timeline follows the prototype (2 / 3 steps, no current-step highlight) — highlight **deferred pending UI design**, leaving A-03 L144 knowingly unmet |
  | Q-01 | 予定日 keeps its four presets but is wired to real filtering via `scheduledFrom` / `scheduledTo`                                                      |
  | Q-04 | ブランド exposes all five backend brands, matched on the record's brand value                                                                         |
  | Q-02 | Moot — consumed by Q-11                                                                                                                               |

  Spec edits: `## Clarifications` session added (5 bullets); three Out of Scope rows added (heatmap, 処理完了 in list, timeline highlight); User Story 4 deleted; one heatmap edge case replaced with a multiple-applications-per-member case; FR-010, FR-015, FR-022, FR-024, FR-025, FR-026, FR-028, FR-029, FR-064 revised; FR-025a and FR-064a added; FR-036 – FR-044 deleted with identifiers retired, not reused; API contract mapping, display-state table and traceability rows updated; Q-01 – Q-04, Q-10, Q-11 marked resolved.

  `parity.md`: PAR007, PAR016 and PAR052 – PAR066 retired (134 → **117 active**); PAR012, PAR014, PAR015, PAR030, PAR032, PAR102 amended; blocked items 6 → **3** (PAR072, PAR109, PAR134).

  Counts re-verified after the pass: **76 FRs · 3 user stories · 32 acceptance scenarios · 8 edge cases · 5 inline clarification tags · 117 active parity items.** Heading structure unchanged apart from the two permitted new headings.

- **Iteration 3 (2026-08-05, `/speckit.clarify`, second pass)**: five more questions asked and answered — Q-12, Q-07, Q-05, Q-14, Q-15 — plus Q-09 and Q-08 closed without spending questions. **Thirteen of fifteen** Q&A entries are now closed; **Q-06 and Q-13 remain open**.

  | Q    | Decision                                                                                                                                                                                                                 |
  | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | Q-12 | 個別会費調整中 badge dropped from A-03; FR-014 / FR-056 retired. The concept is real but belongs to A-01-01 (A-01 FR-006), and its read model is exposed only on the member-detail response                              |
  | Q-07 | 退会手数料 renders the real fee instead of V0's hardcoded dash; 未消化レッスン kept on both types → backend request #1                                                                                                   |
  | Q-05 | Search kept but must be **server-side** across the whole filtered set (page-local explicitly forbidden) → backend request #2                                                                                             |
  | Q-14 | Screen-map 変更履歴 tab confirmed stale; no tab, `statusHistories` unused in Phase 1                                                                                                                                     |
  | Q-15 | 会員ID = member number, 申請ID = application number, UUIDs for routing only; head-up card kept in full via an expanded member block inlined on both detail responses → backend request #3                                |
  | Q-09 | Closed without a question — the project already has `src/components/common/data-state-boundary/` (`isLoading` → skeleton, `isError` → error + retry, `isEmpty` → empty) and a `toast.error` pattern for failed mutations |
  | Q-08 | Closed by inference — a confirm button that does nothing is a defect in the same class as Q-01 / Q-05 / Q-07, all resolved by fixing rather than reproducing. Dialog wording left per screen to avoid inventing copy     |

  **Mock-first policy recorded** (Assumptions): where the real API lacks something, the project's mock implements it with the same semantics and the gap goes to the client through the API QA process — so none of the three backend requests blocks Phase 1.

  Spec edits: 5 more Clarifications bullets (10 total); two Out of Scope rows added (個別会費調整中 badge, 変更履歴 tab confirmed); FR-009, FR-019, FR-057, FR-058, FR-067, FR-068, FR-080, FR-081, FR-082 revised; FR-019a, FR-057a, FR-080a, FR-082a added; FR-014 and FR-056 retired; one US2 scenario removed and the story renumbered; Key Entities, API mapping and Assumptions updated; Q-05, Q-07, Q-08, Q-09, Q-12, Q-14, Q-15 marked resolved.

  `parity.md`: PAR029 and PAR080 retired, PAR082a added (117 → **116 active**); PAR006, PAR027, PAR078, PAR082, PAR084, PAR107, PAR109, PAR134 amended; blocked items 3 → **1** (PAR072 only).

  Counts re-verified: **77 active FRs (2 retired) · 3 user stories · 31 acceptance scenarios · 8 edge cases · 1 inline clarification tag · 116 active parity items.** Heading structure unchanged.

- **Iteration 4 (2026-08-05, `/speckit.plan`)**: the last two entries closed on codebase evidence rather than by asking, because planning surfaced facts the spec had been reasoning about second-hand — see [research.md](../research.md) §1–§2.

  | Q    | Decision                                          | Note                                                                                                                                                                                                                                  |
  | ---- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Q-06 | Page sizes 25 / 50 / 100, default 25; 200 dropped | The deciding fact was local, not remote: `leave.schema.ts` already caps `limit` at 100, so the **mock** returns 400 for 200                                                                                                           |
  | Q-13 | Keep the sorting that already exists              | **Answer reversed.** The spec had assumed "no sort, as V0"; the shipped screen has sorting working end to end. Dropping the 申請ID key with its column, and realigning the default to `scheduled_date asc` to match the real contract |

  The headline finding of this iteration is broader: **A-03 is already implemented** at `src/app/(private)/members/leaves/` (~1,365 lines plus 6 route handlers), built on `feat/member-leave` before this spec existed. Five clarifications (Q-01, Q-04, Q-05, Q-08, Q-09) turn out to be **already satisfied** by that code. `plan.md` is therefore a reconciliation plan, not a construction plan, and carries an explicit gap analysis in three parts: must-remove (A1–A3), must-add (B1–B11), must-change (C1–C7).

  Spec edits this iteration: FR-031 rewritten (25/50/100, tag removed); **FR-035a added** (sortable headers — a new requirement, since the previous "sorting is out of scope" line was wrong and has been deleted); Q-06 and Q-13 marked resolved.

  **Final counts: 79 active FRs (2 retired) · 3 user stories · 31 acceptance scenarios · 8 edge cases · 0 clarification tags · 15/15 Q&A entries closed · 116 active parity items.**
