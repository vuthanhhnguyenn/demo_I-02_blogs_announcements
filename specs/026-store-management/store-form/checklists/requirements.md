# Specification Quality Checklist: Store Master Registration & Edit Form (Y-02 FR-002)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-03
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

- **All checklist items now pass.** `/speckit-clarify` ran on 2026-09-03 and resolved five questions; no `[NEED CLARIFICATION]` marker remains in the spec.
- Clarification session outcomes, in the order asked:
  1. **Store-page content and image controls** → _removed_, following the prototype strictly. Consequence accepted and recorded: the 14 store-page fields and the store photos / floor map have **no write path in Phase 1**, and Staff lose the 店舗写真・フロアマップ editing that Y-02's permission matrix grants them. Gap logged against the prototype owner (cluster tracking 2026-08-19, QA #208). → FR-004, FR-010, FR-051, Out of Scope.
  2. **Role gate** → enforced at _both_ layers, including the per-field Staff subset, matching 027 and the backend's own `system / headquarter only` declaration. → FR-080–FR-082, FR-086, FR-088, FR-089, SC-009.
  3. **店舗コード editability** → _editable_ for System / Headquarter. **Superseded 2026-09-04**: the client's own answer of 2026-08-24 (QA #205 §1-④, recovered from their original reply) calls the prototype's 「登録後の変更不可」 line wrong and asks for a warning plus a confirmation dialog, so this screen carries one helper line the prototype does not govern. → FR-012, FR-061a, FR-061b.
  4. **Opening dates** → _three_, per the client's sign-off of 2026-08-24 (QA #202), ahead of the prototype: 受付開始日, プレオープン日, 開店日, plus 閉店日, in chronological order. The prototype added both controls at `a7d0c88` (2026-09-16); labels/helper text follow it (Session 2026-09-24). Also logged: the backend describes `receiptDate` as a handover date while the client described it as the enrollment-reception start date — the client's meaning governs. → FR-019, FR-019a, FR-114.
  5. **Weekly-hours persistence** → replace issued _only when the table changed_, so a non-hours save cannot overwrite hours changed on 027. Requires the weekly table to be tracked state rather than V0's uncontrolled inputs. → FR-045a, FR-045b, FR-070a, SC-010.
- Two sections extend the template deliberately: **"Current Repository State — the delta this feature closes"** (the repo already ships an older store form, so planning must not mistake it for the target) and **Appendix A** (the backend contract the project mock mirrors, plus the gaps the mock fills).
- Appendix A names endpoints and DTO fields. That is the backend _design_ this feature's mock must mirror — a contract input, not a leaked implementation choice — and follows the convention of the sibling 026 / 027 specs.
- `parity.md` holds **144 items** (counted 2026-09-04; the earlier note said 134) across 13 regions. Nineteen of them are **spec-governed rather than V0-derived** and flagged inline: PAR020 (client-mandated helper copy), PAR020a, PAR020b, PAR121, PAR062–PAR064 (the two added dates and their row order), PAR077, PAR078 (weekly-hours persistence and state), PAR150/PAR151 (loading and error states the mockup has no equivalent for) and PAR160–PAR168 (the divergences recorded after implementation, PAR166–PAR168 added 2026-09-04).
- Follow-up QAs to raise with the **prototype owner** (not the client, who has already answered): the missing store-page/image inputs, the 店舗コード helper-text wording **and its confirmation dialog**, the two added opening-date fields, and **locking ブランド once the store has opened**. For **BE**: the `receiptDate` description contradicts the client's stated meaning, and `PATCH /stores/{id}` still refuses Staff instead of accepting the client's three-field whitelist.
- **Correction 2026-09-04.** QA #205's three answers were found in the client's original reply (§1-④) after this spec was drafted from the Notion `Quick Answer` alone. Three decisions changed: the 店舗コード copy + confirmation dialog, locking ブランド once the store has opened, and narrowing the Staff whitelist to `name` / `address` / `phone`. They are recorded in `spec.md` → Clarifications (Session 2026-09-04) and listed as open work in "Open deltas after the 2026-09-04 correction"; the built screen does not carry them yet.
- **Implemented 2026-09-03.** The screen, its mock endpoints and the spec were brought into line in one pass; `spec.md` → "Implementation Notes" records what was built, what was removed, the mock changes, the verification run, and the deliberate divergences from V0 (five as built, seven after the 2026-09-04 correction). `npm run type-check` and `npm run lint` are clean.
