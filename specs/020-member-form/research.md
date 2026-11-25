# Phase 0 Research: Member Form Management (020-member-form)

**Date**: 2026-07-28 · **Spec**: [spec.md](./spec.md) (clarified — 0 open markers)

All product-level questions were closed in the 2026-07-28 clarify session. This document records the **implementation-level decisions** for each delta between the current code and the clarified spec, so Phase 1 design and `/speckit.tasks` need no further judgement calls.

---

## R1 — Validation strategy: blank-only, prototype-verbatim messages

> **SUPERSEDED 2026-07-28 (post-implementation user decision — see spec Clarifications & FR-016a)**: blank-only was too literal a reading of "prototype wins"; the prototype governs the UI only. Full semantic validation (kana / phone / email / postal formats, max lengths) is restored on top of the verbatim blank messages. The rest of this entry is kept for history.

**Decision**: Rewrite `member-form.schema.ts` so the eight required fields validate **blank-only** (trimmed) with the prototype's exact messages (「氏名（姓）を入力してください」 …「メールアドレスを入力してください」, 性別 = 「性別を選択してください」). Drop the kana regex, phone digit-count, postal-code regex, `.email()` format rule and max-50 caps from the client schema. メールアドレス keeps only the browser `type="email"` hint (spec A7). 郵便番号/住所 have no rules at all (FR-017). Validation mode stays `onSubmit`; error clearing on change is provided by RHF `reValidateMode: 'onChange'` semantics, matching FR-019.

**Rationale**: FR-015/016/017 and PAR040–PAR050 pin both the trigger and the copy; QA test cases are authored from the spec, so the current 「…は必須です」 messages and format rejections would fail TC execution. The mock API's `UpdateBasicInfoRequestSchema` still validates server-side; a format rejection surfaces through the FR-031 error toast.

**Alternatives considered**: Keeping the existing format regexes as an additive layer — rejected: produces messages and rejection behaviour the spec doesn't define (violates PAR050 for 郵便番号, deviates from FR-016 copy). Moving format rules to `onBlur` — rejected: FR-015 forbids non-submit validation.

## R2 — 性別 fourth value: store `no_answer` as a first-class enum member

**Decision**: Add `'no_answer'` to the Zod `GenderSchema` in `src/app/api/_schemas/member.schema.ts` (OpenAPI source of truth first), and surgically add `NO_ANSWER: 'no_answer'` to the generated `Gender` const in `src/lib/api/types.gen.ts`. UI labels: 男性/女性/その他/回答しない map 1:1 to `male/female/other/no_answer`.

**Rationale**: Q12 resolution requires 回答しない to round-trip as its own value and not collapse into その他. A distinct enum value is the only shape that survives GET→form→PATCH→GET intact. Justified against Constitution II in plan.md Complexity Tracking (regen = ~16k stale churn; surgical edit is established project practice).

**Alternatives considered**: Map 回答しない→`null` — rejected: indistinguishable from "never set", and the generated mutation body type would still need editing. Full client regen — rejected (churn, stale committed openapi.json).

## R3 — Unsaved-changes guard: shared hook + route-local dialog

**Decision**: Create `src/hooks/use-unsaved-changes.hook.ts` porting the V0 hook contract (`dirty/setDirty/confirmDiscard/discardDialogOpen/handleDiscardConfirm/handleDiscardCancel` + `beforeunload`), drive `dirty` from RHF's `isDirty` (`useFormState`) via an effect, and render a route-local `member-edit-discard-dialog.tsx` with the prototype copy (「変更を破棄しますか？」/「未保存の変更はすべて失われます。この操作は取り消せません。」/「編集を続ける」/「破棄する」).

**Rationale**: FR-020–022 and PAR061–072 demand exactly this behaviour; RHF already tracks dirtiness so the hook only orchestrates confirmation + `beforeunload`. A shared hook (vs. a third hand-rolled dialog after banners/equipment) is the smaller footprint — tracked in Complexity Tracking.

**Alternatives considered**: Next.js router events interception — rejected: App Router has no stable route-change-blocking API; explicit `confirmDiscard(onConfirm)` on the two exits (cancel, back link) matches the prototype exactly. Reusing `banner-discard-dialog` — rejected: different copy and coupling to banner state.

## R4 — Header & footer: prototype shapes with project components

**Decision**: Header = `BackLink` (「会員管理に戻る」, wired through `confirmDiscard`) + `PageHeader`-style title 「会員情報を編集」, replacing the BreadcrumbNav. Footer = inline row at the end of the form column (`border-t`, right-aligned 「キャンセル」 outline + 「保存する」 primary, summary 「未入力の項目があります」 with `mr-auto` shown only after a failed submit), replacing the fixed bottom bar. 「保存する」 is always enabled (D7); submitting a pristine form simply validates and saves.

**Rationale**: PAR004–PAR008 and PAR035–PAR039 enumerate these exactly; `back-link.tsx` and `page-header.tsx` already exist in `src/components/common/`.

**Alternatives considered**: Keeping the fixed bottom bar — rejected: parity items PAR035/038 describe an inline footer with the summary in the same row; the fixed bar also keeps the disabled-until-dirty behaviour the prototype doesn't have.

## R5 — Save payload: `basic_info` only, eight groups

**Decision**: The submit maps form values to `PATCH /crm/members/{id}` with **only** `basic_info: { name_kanji, name_kana, gender, birthday, postal_code, address, phone, email }`. `profile_info`, `emergency_contact`, `notes` are never sent (untouched attributes preserved per FR-024). Keep `normalizePostalCode`/whitespace trimming utilities.

**Rationale**: Q10 resolution — existing mock contract, eight FR-004 groups only. `UpdateMemberRequestSchema.basic_info` is already optional-field-wise compatible.

**Alternatives considered**: `PUT /crm/members/{id}/basic-info` — viable but the page's mutation, invalidation and generated helpers already target the PATCH; switching adds churn without spec value.

## R6 — Page guards: role gate + withdrawn block

**Decision**: In `edit/page.tsx`, before rendering the form: (1) `useAuthUser().hasRole([UserRole.System, UserRole.Headquarter])` — if false, render a permission-denied state (shared empty-state pattern, no form mount) per FR-032; (2) keep the existing withdrawn block (退会済み/強制退会 → 「退会済みの会員は編集できません」 + 再入会 guidance + return-to-detail) per FR-033. Order: load member → withdrawn check → role check is independent of load (role check first, cheapest).

**Rationale**: FR-032/033, PAR078/079; `useAuthUser`, `UserRole` already exist — no new machinery.

**Alternatives considered**: Middleware/route-level guard — rejected: role lives in client context in Phase 1 mock auth; a page-level state matches sibling screens.

## R7 — Form trim: one card, ten inputs, exact order

**Decision**: Rewrite `members-form.tsx` to a single 「個人情報」 card containing, in order: 氏名（姓/名） pair, フリガナ（姓/名） pair, 生年月日 (DatePicker) / 性別 (Select) pair, 郵便番号 (w-[200px]), 住所, 電話番号/メールアドレス pair — with `RequiredMark` on the eight required labels, no marker on 郵便番号/住所, and the prototype placeholders verbatim. Photo, emergency contact, 契約情報 card, 備考 card are deleted from the form; their schema fields are removed from `member-form.schema.ts`.

**Rationale**: FR-007–FR-014, PAR009–PAR034. FR-024 guarantees deleted-from-form attributes are simply never sent, so no data loss.

**Alternatives considered**: Hiding the extra sections behind a flag — rejected: YAGNI (Principle V), spec says exactly one card.

## R8 — Change history: written by the backend, verified by us

**Decision**: No history-related **client** code in this feature — the save stays a single `PATCH` and issues no separate history request. What changed on 2026-09-21 is the _obligation_: the backend writes the audit row inside that same request, so FR-028 is a real outcome the feature is accountable for and must be verified after every successful save.

**Rationale**: Q8/FR-028 as re-resolved 2026-09-21 — `member_change_histories` is a served source behind `GET /api/v1/admin/members/{memberId}/change-history` and the member detail 変更履歴 tab reads it live, so a missing record after a successful save is a defect rather than a deferred gap.

---

**Outstanding NEEDS CLARIFICATION**: none.
