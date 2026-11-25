---
name: plan-testcases
description: >-
  Author the test plan for a feature — the up-front directive that splits a
  feature into test units (one per screen/cluster), maps each unit's sources and
  coverage focus, and traces every requirement to a unit. Use when asked to "lên
  plan test / plan testcase / write a test plan" for a spec before writing cases.
  Produces `specs/<feature>/tests/test-plan.md`, which `gen-testcases` reads to
  know WHAT to author and `execute-testcases` reads for run order + execution notes.
---

# Plan the test work for a feature

You are a **test lead** scoping a feature into a plan — you do **not** write test
cases here (that's `gen-testcases`) or run them (`execute-testcases`). The
deliverable is one file: `specs/<feature>/tests/test-plan.md`.

## Phase 2 — what changed (read first)

The project has moved past the mocked-backend phase. Screens that went through
`integrate-real-api` now talk to the **real dev backend**
(`NEXT_PUBLIC_REAL_API_URL`, e.g. `https://api.dev.fitness-v2.okamoto-hd.com`) and
sign in with **real Cognito accounts**. Three consequences for the plan:

1. **BE-owned outcomes are now in scope, not deferred.** Server-side validation,
   real error codes (`E-XXX-nnn`), 401 session expiry, server-enforced permissions,
   real pagination totals, real two-tab conflicts — the plan must put these into a
   unit's coverage focus instead of writing them off as "mock can't do it".
2. **A Round 1 integration leaves known gaps.** Read the feature's
   `specs/<feature>/integration-plan.md` if it exists and carry its **blocker table
   (`Bn`)** into the plan, so `gen-testcases` writes those cases and
   `execute-testcases` records them as `Block (Bn)` instead of `NG`.
3. **The backend is shared and mutable.** There is no seed reset any more. The plan
   must say which unit creates its own data, what prefix it uses, and which
   pre-existing records are off-limits for destructive cases.

## Inputs (ground the plan in these only)

- Feature spec `specs/NNN-*/spec.md` — the FR list, user stories, edge cases. **This
  is the first-priority source.**
- Requirement docs it references (`.cache/fitness-spec/crm/requirements/*.md`).
- UI prototype / mockups (`.cache/fitness-crm-ui/src/pages/*.tsx`) — **second
  priority**, for the screen inventory and UI detail.
- `specs/<feature>/integration-plan.md` — **not an oracle**, a register of known
  Round 1 gaps and Round 2 blockers.
- ⛔ Do **not** read app source (`src/**`, `route.ts`, schemas, seeds) to decide
  what should happen. The single exception is `src/lib/auth/demo-users.ts`, which is
  the **QA credentials sheet** (real Cognito accounts, one per role) — read it to
  pin credentials, nothing else.

## Source priority — spec first, prototype second

Where the spec and the prototype disagree, the **spec wins**; the prototype supplies
UI detail the spec does not carry. Record both kinds of delta in the plan so
`gen-testcases` carries them into the case Notes:

- **Spec-only** — a requirement with no prototype screen/control. It still gets
  cases, judged on the spec's intent, and the plan lists it so the missing UI
  reference is visible rather than silently dropped.
- **Conflict** — spec and prototype describe different behaviour. Plan to the spec
  and name the conflict for resolution.

## The unit rule

The test-case unit is **one screen**. Cluster screens into one unit only when they
are simple or tightly related (e.g. a step flow, or modals that exist only inside a
parent screen). Split the feature this way first — everything else hangs off it.

## Plan contents (produce exactly these sections)

1. **Header** — spec link, PO spec id, created date, integration round the screens
   are on (Round 1 / Round 2 / still mock), and a "Consumed by: gen-testcases →
   execute-testcases" line.
2. **Scope** — in-scope screens and, explicitly, out-of-scope ones (navigation
   targets / separate specs) so no unit silently expands.
3. **Unit table** — `# | unit | screen(s) | route | TC doc filename`. Filenames
   follow gen-testcases' convention: `TC -【Fitness CRM】- [<ScreenID>][<Name>].md`,
   all under `specs/<feature>/tests/cases/`.
4. **Sources per unit** — `unit | spec sections | UI prototype file | FRs covered`.
   This is what tells gen-testcases to read only that unit's slice, not the whole
   spec.
5. **Spec-vs-prototype deltas** — `item | in spec | in prototype | how to test`.
   One row per spec-only requirement and per conflict (see **Source priority**).
   `gen-testcases` must mark each of these in the case's Notes.
6. **Coverage focus per unit** — the unit-specific high-value areas. These are
   **added to**, not a replacement for, gen-testcases' full coverage walk. Every
   unit's focus list must include, at minimum:
   - **Real-API behaviours** relevant to the unit: server-side validation beyond the
     client's, the error codes the screen can receive, 401 expiry, server-enforced
     role/scope, real pagination totals, persistence after reload/re-login.
   - **UI breakage under stress** — long/variable-length values (max-length full-width
     Japanese name, an equally long unbroken token, long e-mail, longest enum/badge
     label, many chips/tags) in every place they render, **at the 1024px floor**.
   - plus the unit's own computed values, role×scope gating, business-rule blocks,
     payment/time boundaries, …
7. **Known Round 1 gaps** — `Bn | blocker | UI behaviour in Round 1 | test treatment`,
   copied from `integration-plan.md`. Treatment is normally "case written to the spec,
   result recorded `Block (Bn)`".
8. **Traceability map** — every `FR-xxx → unit`. Confirm each requirement lands in
   ≥1 unit; call out any that don't.
9. **Execution notes (for execute-testcases)** — and in phase 2 these are what keep a
   run from damaging shared data:
   - **Credentials**: the real Cognito accounts (`src/lib/auth/demo-users.ts`) and
     which role each case's pre-condition maps to. Note that the header's
     「デモ: ユーザー切替」 switcher only appears when `NEXT_PUBLIC_APP_ENV=development`.
   - **Environment**: the real backend base URL the run points at; that it is
     **shared** with other people.
   - **Data policy**: which records the run may create (with the agreed test prefix),
     which pre-existing records must never be edited or deleted, and how a
     destructive case gets its own throw-away record. **No seed reset exists.**
   - **Known-gap policy**: a failure matching a `Bn` row → `Block (Bn)`; an
     undocumented failure → `NG`.
   - **Viewport**: run at **1024×768** (the supported floor) for layout cases and
     **≥1440px** for the wide check; below 1024px is out of scope.
   - **Account safety**: repeated wrong-password cases lock a real Cognito account
     for ~15 minutes — plan any lockout case last, on an account no other case needs.
10. **Suggested order** — usually P1 core screens first, dependents (screens that
    consume created records) last, with one line of rationale each. Put data-creating
    units before units that read that data, and destructive cases at the end.
11. **Definition of done** — TC docs created per unit, every FR traced, checklist
    gaps fixed first, each doc executed once, created test data cleaned up or
    explicitly left with a note.

## Report

Tell the user: the plan file path, the unit count with the split rationale, any
**out-of-scope** screens you excluded (and why), any **requirement with no unit**,
the **spec-vs-prototype deltas** you recorded, and the **known Round 1 gaps** carried
in from the integration plan. Then name the next step: run `gen-testcases` on the
first unit.
