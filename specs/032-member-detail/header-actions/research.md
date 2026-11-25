# Phase 0 Research: Member Detail — Header Popups & Side Sheets

**Feature**: `021-member-detail-header-actions` | **Date**: 2026-07-29

The spec entered planning with no `[NEEDS CLARIFICATION]` tokens — the five scope- and model-level unknowns were settled in the 2026-07-29 clarification session. What remained were _implementation_ unknowns: how contract changes reach the typed client, whether the read model can support the gap fixes, and how to resolve the gaps the clarification session did not cover. Those are recorded below.

---

## R-1 — How does a contract change reach the generated client?

**Decision**: Use the project's existing codegen chain with a prettier step inserted:

```bash
npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client
```

**Rationale**: Measured directly. Running `generate-openapi` alone produces a **21,159-line diff** (17,199 insertions / 3,960 deletions) against the committed `src/lib/openapi.json`. Inspecting the diff shows it is entirely array-wrapping formatting — the generator emits raw `JSON.stringify` output while the committed file is prettier-formatted:

```diff
-        "required": ["email", "password"],
+        "required": [
+          "email",
+          "password"
+        ],
```

Running `npx prettier --write src/lib/openapi.json` afterwards reduces the diff to **empty**. The committed spec is therefore an exact match for the current Zod schemas — it is _not_ stale, and a full regeneration is scoped-safe.

**Alternatives considered**:

- _Hand-edit `src/lib/api/types.gen.ts` for the changed fields_ — rejected. Constitution II forbids manual edits to generated files, and the only reason to consider it was the apparent staleness, which does not exist.
- _Call changed endpoints through the raw `client` from `client.gen`_ — rejected for the same reason; it would also break the pattern every sibling surface uses (`postCrmMembersById...Mutation()`).

**Consequence for the plan**: all of Stream B's schema changes are batched behind a single codegen run, and no generated file is touched by hand.

---

## R-2 — Does the read model support the gap fixes, or must the bundle grow?

**Decision**: The bundle already carries everything needed except one field for G-C.

**Rationale**: Inspected `GetCrmMembersByIdResponses` in the generated types. `currentMainContract` exposes `contractId`, `plan`, `store`, `contractStatus`, `startDate`, `endDate`, **`usageStartDate`**, **`cancellationFeeUntil`**, `campaign`, **`activeFeeAdjustment`**, **`activePointDiscount`**, **`activeSuspension`**, and **`pendingWithdrawal`** (with `withdrawalApplicationId` and `scheduledWithdrawalDate`). Top level adds `gateStop`, `blacklist`, `activePenalty`, `unpaidAmount`, `constraints`, `withdrawnAt`, `anonymizedAt`.

That resolves three questions at once:

- **G-A** — `usageStartDate` is present, so the 退会取り消し trigger can be disabled client-side without a new field.
- **G-F / G-04** — the same field derives the withdrawal type, so the operator never picks it (the Q5 decision is implementable as specified).
- **G-11** — `pendingWithdrawal.withdrawalApplicationId` is already in the bundle, so the Phase 2 switch to the application-keyed cancel endpoint needs no read-model change either.

**The one gap**: `activePenalty` carries `penaltyType`, `endAt`, `noShowCount`, `appliedAt` — but **not** the list of reservations that triggered the penalty, which the prototype displays (対象となった予約). This needs a field on the penalty object and a seed value.

**Alternatives considered**: _Fetch the triggering reservations from the lesson-booking history instead of extending the penalty object_ — rejected. It would add a second request to a modal that is otherwise self-contained, and the penalty already owns `noShowCount`, so owning the reservations that produced that count is consistent.

---

## R-3 — Where is the gate-stop write/read model already reconciled?

**Decision**: No change to the gate-stop surfaces; the hybrid already matches the clarified decision.

**Rationale**: The clarification settled that `A-01 FR-014`'s 4 patterns are authoritative and no scope selector is added. Reading the current code, the mock **read** model (`gateStop` on the member bundle) already carries `pattern` _and_ the API's `messageType` and `store`, while the **write** model (`GateStopRequestSchema`) carries `pattern` + `reason` + `terminal_message` + `lock_after_message`. So the pattern concept the API lacks is already first-class on our side, and `lock_after_message` maps cleanly onto `messageType` (`deny_after_confirm` when checked, `allow_after_confirm` otherwise) at the Phase 2 boundary.

This is why G-08 produces two _backend requests_ and zero frontend tasks.

**Alternatives considered**: _Add a scope selector now so the payload matches the API 1:1_ — rejected by the clarification: neither the prototype nor `A-01` has one, and inventing UI to satisfy a field we can default is backwards.

---

## R-4 — Should the confirm-dialog pattern be extracted into a shared component?

**Decision**: No. Copy the pattern into the two surfaces that lack it.

**Rationale**: Eight of the twelve surfaces already implement "validate → open `AlertDialog` → mutate on the dialog's action" inline, each with its own dialog copy tailored to its own effect summary (dates, stores, member name). G-B and G-C add the ninth and tenth. A shared `<ConfirmableSheet>` would have to parameterise the title, the description, the destructive styling, the acknowledgement checkbox, and the per-surface effect summary — arriving at a wrapper with more configuration surface than the code it replaces. Constitution V (YAGNI, "no abstraction layers beyond what already exists") points the same way.

**Alternatives considered**: _Extract now while touching two of them_ — rejected; the right moment for extraction is when a third distinct variation appears, not when copying an established two-line pattern.

---

## R-5 — 移籍理由: the API requires `reasonCode`, the prototype has free text

**Decision**: Keep the optional free-text 移籍理由 in the UI. At the Phase 2 boundary, send `reasonCode: other` and carry the free text in `memo`. Ask the backend to confirm.

**Rationale**: This mirrors the Q5 decision for 退会理由 exactly — the prototype's free-text field wins over an invented picklist, and the API's code becomes a derived value rather than an operator choice. Applying a different rule to transfers than to withdrawals would be an inconsistency with no user-visible justification. The API's transfer `reasonCode` enum (`relocation`, `schedule_change`, `facility_upgrade`, `crowding_avoidance`, `trainer_preference`, `other`) includes `other`, so the mapping is legal without a backend change; the request is only to confirm it is the intended use.

**Alternatives considered**:

- _Add a 6-value picklist to match the enum_ — rejected. It is the exact pattern Q5 removed from the withdrawal sheet, and it is absent from both `A-01` and the prototype.
- _Make the free-text field required and map to `other`_ — rejected. The prototype marks 移籍理由 optional, and the API does not require `memo`.

---

## R-6 — 個人情報削除: adopt the typed confirmation, or keep the prototype's simple confirm?

**Decision**: Adopt the typed `ANONYMIZE` confirmation plus a required 削除理由 (implements G-D and settles the deferred Q7 in practice).

**Rationale**: The API mandates both fields (`confirmation` is an enum of the single literal `ANONYMIZE`; `reason` is required and stored on the change-history metadata), and its description states the UI is expected to present a typed-confirmation modal. The operation overwrites 19 PII columns irreversibly. Diverging from the prototype here costs one text input and buys alignment with a hard API precondition — and building the simple version now would guarantee rework the moment the real endpoint is wired.

**Alternatives considered**: _Keep the simple confirm and have the client inject the literal_ — rejected. It satisfies the schema while defeating its purpose: the literal exists precisely so a human types it, and auto-injecting it turns an irreversible action back into a single click.

---

## R-7 — Suspension range validation at month granularity

**Decision**: Enforce, on `YYYY-MM` values: 休会開始月 not before the current month; 休会終了月 after 休会開始月; span at most 12 months. Enforce 復帰月 not before the current month for the release.

**Rationale**: The API's `BR-SUS-001` states `startDate >= today`, `endDate > startDate`, `endDate <= startDate + 12 months` on _dates_, while the prototype and our implementation work in _months_. Month granularity is the approved UX, so the rules are translated to month comparisons rather than the UI being changed to dates. This also gives the 休会解除 sheet its 復帰月 rule from the Q3 decision (current month or later, no retroactive release), which the mock currently does not enforce at all.

**Month → date mapping (2026-10-12)**: `startDate` = the 1st of 休会開始月, or **today** when 休会開始月 is the current month (a 1st that is already past fails BR-SUS-001 with a past-date error); `endDate` = the last day of 休会終了月. Edge: on the last day of a month, a single-month suspension of the current month gives `startDate = endDate`, which `endDate > startDate` rejects — left to the server message.

**Alternatives considered**: _Switch the sheets to date pickers to match the API exactly_ — rejected. It contradicts the prototype and `A-01`'s month-based 休会費 model, and month→date widening is trivial at the Phase 2 boundary (first of the start month, last of the end month).

---

## Summary of decisions

| ID  | Area             | Decision                                                                                                |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| R-1 | Codegen          | Zod → `generate-openapi` → **prettier** → `generate-client`; committed spec is not stale; no hand-edits |
| R-2 | Read model       | Already sufficient; only `activePenalty` needs the triggering-reservation list                          |
| R-3 | Gate stop        | Hybrid already correct; G-08 yields backend requests only                                               |
| R-4 | Confirm dialogs  | Copy the established inline pattern; do not extract a wrapper                                           |
| R-5 | 移籍理由         | Keep free text; derive `reasonCode: other` at the Phase 2 boundary; confirm with backend                |
| R-6 | PII deletion     | Adopt typed `ANONYMIZE` confirmation + required reason                                                  |
| R-7 | Month validation | Translate the API's date rules to month comparisons; add the missing 復帰月 rule                        |
