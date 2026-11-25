# Phase 0 Research: Member Detail — The 10 Tabs

**Feature**: `022-member-detail-tabs` | **Date**: 2026-07-29 | **Plan**: [plan.md](./plan.md)

No `NEEDS CLARIFICATION` tokens remained in the Technical Context, so Phase 0 is not about unknown technology — the stack is fixed by the constitution and every tab already runs on it. What needed resolving was **how** to close the clarified gaps without destabilising 22 working cards. Each decision below is recorded as Decision / Rationale / Alternatives.

---

## R-1 — Codegen chain is a verified no-op, so contract work is mechanical

**Decision**: Treat `npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client` as the single, authoritative path from a Zod edit to a typed client, run **once** at the end of Stream B.

**Rationale**: Verified on this branch on 2026-07-29 — running the full chain against the untouched repo produces an **empty diff** on both `src/lib/openapi.json` and `src/lib/api/*.gen.ts`. The committed spec therefore matches the Zod schemas exactly, which means any diff appearing after Stream B is _our_ change and nothing else. (Note: `generate-openapi` alone emits unformatted JSON and shows a ~17k-line diff; the `prettier --write` step is mandatory, not cosmetic.)

**Alternatives considered**:

- _Hand-edit the generated client for the two new fields_ — forbidden by Constitution II, and would silently diverge on the next regeneration.
- _Regenerate after each schema edit_ — three redundant runs and three noisy diffs to review; a single run at the stream boundary is cheaper and easier to review.

---

## R-2 — Model the pending plan change as a field on the contract read, not a generic "pending application" abstraction

**Decision**: Add `pendingPlanChange` to the main-contract read and to the bundle's `currentMainContract`, mirroring how `pendingWithdrawal`, `activeSuspension` and `activeFeeAdjustment` are already modelled. The 主契約 card renders it inline, read-only (the cancel confirm dialog was withdrawn 2026-09-09 — see spec.md FR-013a).

**Rationale**: The bundle already expresses four "something is scheduled/active" states as optional objects on `currentMainContract` ([member.schema.ts:701](src/app/api/_schemas/member.schema.ts)). A fifth follows the established shape, so the card, the head-up badge logic and the Phase 2 mapping all keep working the same way. It also means the pending state is available anywhere the bundle is already loaded — no extra query.

**Alternatives considered**:

- _A generic `pendingApplications[]` collection with a discriminated `type`_ — a bigger read-model change touching feature `021`'s head-up card, for one new member. Rejected as speculative generality (Constitution V).
- _A separate `GET …/plan-changes` query_ — an extra round trip on every 契約操作 visit to answer a question the bundle can answer for free.

---

## R-3 — Keep the Phase 1 route path, change only its semantics

**Decision**: `PATCH /crm/members/{id}/contracts/main-contract/change` keeps its path but now **creates a pending application** instead of mutating the contract; cancellation is a new sibling route. The design doc's contract-keyed `POST …/contracts/{contractId}/plan-changes` is recorded as the Phase 2 target.

**Rationale**: The semantic change (FR-013a) is what the clarification decided; the path change is a Phase 2 boundary concern. Doing both now would churn the generated client's method names for no Phase 1 benefit, and the mock route is the only consumer of the path. This mirrors how `021` handled `個人情報削除` (payload now, path at the Phase 2 switch).

**Alternatives considered**:

- _Adopt the design doc's path and body immediately_ — renames the generated hook (`patchCrmMembersByIdContractsMainContractChangeMutation` → a new name) and touches the card for no behavioural gain.
- _Keep the direct mutation and only add a badge_ — contradicts the resolved clarification; the card would claim a pending state that no record backs.

---

## R-4 — Block a second plan change while one is pending, server-side

**Decision**: The create route returns `409` when a pending application already exists; the card disables 変更 with the reason stated on the trigger.

**Rationale**: FR-013a requires it, and the pattern matches the rest of the screen — every blocking condition on this screen is surfaced _before_ submission (SC-005), with the server as the final arbiter. Client-only gating would let a stale tab create a duplicate.

**Alternatives considered**:

- _Allow multiple pending changes, last-one-wins_ — makes the effective plan unpredictable at month start and gives the operator no way to see which will apply.
- _Client-side check only_ — fails on a stale tab; the mock must be the source of truth so Phase 2 behaviour is identical.

---

## R-5 — Billing status stays one server-supplied field

**Decision**: Keep the single `BillingStatusSchema` (`pending` / `confirmed` / `paid` / `uncollected` / `written-off`, [member.schema.ts:2551](src/app/api/_schemas/member.schema.ts)) that the mock already returns, and record the required `confirmStatus` × `collectionStatus` → single-status mapping as a backend request. No Phase 1 code change.

**Rationale**: FR-022's actual requirement is that the **client must not implement the precedence rule** — and it already doesn't; it renders whatever single status arrives. Introducing the two-axis model into our mock now would mean writing a derivation the real backend will own anyway, then deleting it at the Phase 2 boundary.

**Alternatives considered**:

- _Store both axes in the mock and derive in the route_ — faithful to the design doc, but it is throwaway code for a mock, and it risks our derivation drifting from the backend's once the real rule is specified.
- _Two columns in the table_ — explicitly rejected by the clarification (Q2 answer A).

---

## R-6 — 1DayPass status: adopt the design doc's 5 values now, with the prototype's Japanese labels

**Decision**: Widen the enum to `active` / `pending_start` / `used` / `expired` / `cancelled` and label them 有効 / 開始前 / 利用済み / 期限切れ / キャンセル.

**Rationale**: This is the one place where widening now is cheap and closing the gap later is not: the enum lives in one Zod schema, one mock route and one label map, and a status the UI cannot render at all (`cancelled` today falls through to a raw value) is a visible defect rather than a cosmetic difference. The label 利用済み follows the prototype, resolving P-02's wording split in the prototype's favour since it is UI copy, not domain vocabulary.

**Alternatives considered**:

- _Keep 3 values until Phase 2_ — leaves `active` / `pending_start` / `cancelled` rendering as raw enum keys the moment the real API is connected.
- _Keep the project's 使用済み / 未使用 wording_ — 未使用 is not equivalent to the design doc's `active`+`pending_start` split, so the wording would have to change anyway.

---

## R-7 — Wording conflicts: the prototype wins (decided 2026-07-29, superseding this document's planning-time recommendation)

**Decision**: **The prototype is authoritative for user-visible strings.** Lesson statuses are relabelled to 受講済み / キャンセル / 予約中; the `absent` state, which the prototype never renders, keeps 欠席 so all four `A-01 FR-010` states stay expressible. The training-records empty message keeps the prototype's period-scoped phrasing — unchanged.

**Rationale**: This is a product decision, taken on the clarification answer to spec Q7, not a technical trade-off. It replaces the split rule this document originally proposed (prototype for layout/copy, `A-01` for domain vocabulary), under which the lesson labels would have stayed as they are. The data model is unaffected: the four status _values_ are unchanged, only their labels move, so nothing downstream of the enum shifts.

**Consequence**: `A-01 FR-010`'s wording (参加 / 欠席) no longer matches the screen for two of the four states. That divergence is deliberate and recorded in FR-026 and gap P-04, so a later `A-01`-parity pass does not silently revert it — T014 also leaves a comment in the code for the same reason.

**Alternatives considered**:

- _Keep `A-01`'s 参加済み / 予約済み (the original recommendation here)_ — overruled by the answer to Q7.
- _Adopt only three labels, as the prototype does_ — would leave the `absent` state unlabelled, and the mock already produces it.

---

## R-8 — Defer the seven Phase-2 shape reconciliations rather than pre-adapting

**Decision**: G-11, G-14, G-15, G-17, G-19, G-20, G-21 and G-22 (payments, access logs, lesson bookings, points, training records, body data, referrals, change history) keep their current mock shapes; each mismatch is documented per endpoint in [contracts/mock-api.md](./contracts/mock-api.md).

**Rationale**: Each of these cards works today and is driven by a mock we control. Rewriting them to the design doc's shape now means rewriting them twice — once to guess the backend's field names, once when the real payload arrives — while the visible behaviour stays identical. The documented mapping is what makes the Phase 2 switch mechanical; the rewrite is not.

**Alternatives considered**:

- _Pre-adapt every mock to the design doc's field names_ — large diff across 8 cards, no user-visible change, and it bakes in guesses about fields the design doc leaves undefined (e.g. referral reward status, which the API does not model at all).
- _Add an anti-corruption mapping layer_ — a new abstraction the constitution's Principle V rules out; the generated client already is the boundary.

---

## R-9 — The nine mock-only reads stay mock-only, and the request list is the deliverable

**Decision**: 家族会員, 入退館設定, 通知受信設定, 契約サマリー, 支払いサマリー, 利用状況, オプション利用履歴, member-scoped survey responses and the main-contract read keep their mock routes; the backend request list is produced as part of `contracts/mock-api.md`.

**Rationale**: The clarification session explicitly chose "keep the card / keep the tab and request the endpoint" for the two cases where dropping was on the table (Q1, Q3). The answer to Q5 then generalised it: the member-history endpoints are **design-only**, so the whole screen reads from the mock API in Phase 1 and any mock route a tab still needs is created here — the only one missing is the plan-change cancel route (T023). Applying one treatment to all of them keeps the screen whole and makes the missing-endpoint list a single, reviewable artifact for the backend team instead of scattered code comments.

**Alternatives considered**:

- _Hide the cards without a real endpoint_ — would strip six cards from a screen the prototype and the PO spec both specify.
- _Compute the aggregates client-side_ — the spec's own assumption forbids it: an aggregate computed over a paginated page would disagree with the table beside it.
