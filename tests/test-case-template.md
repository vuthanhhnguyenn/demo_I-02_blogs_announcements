# Test Case Document Template

> Source: `TC -【Project Name】- [Screen ID][Funtion Name].xlsx` (sheets `Tempalte` and `Copy of Tempalte`), translated/consolidated into English.
> Purpose: base template for writing a per-screen/per-function test case document. Copy this file, rename it following the convention below, fill in the metadata block, then add one row per test case to the table. Base the actual test steps on [common-gui-validate-checklist.md](checklists/common-gui-validate-checklist.md) and [common-function-checklist.md](checklists/common-function-checklist.md) where applicable.
>
> **Output language:** write the document in **English**. Keep source-language text (Japanese) **verbatim only where the case asserts on it** — UI labels, button captions, error/toast messages, enum/status text, and concrete field values/counts the tester must match against the screen or spec. Everything else (categories, steps, expected-result prose, notes) is English; gloss a verbatim string in English on first use if helpful, e.g. `会員規約 (Membership terms)`.
>
> **Execution:** the project runs **a single test pass** (no Round 2). A failing case is logged as `NG` with a bug id; the developer re-verifies it manually after fixing. Only add extra execution columns if a formal re-test round is later required.

## File naming convention

```
TC -【Project Name】- [Screen ID][Function Name].md
```

Example: `TC -【Fitness CRM】- [D17][Terms Management].md`

Location: generated TC docs live under `specs/<feature-folder>/tests/cases/`
(grouped by feature/spec, e.g. `specs/017-terms-management/tests/cases/`). This
template stays at the `tests/` root; the shared checklists live under
`tests/checklists/`.

## Metadata

| Field              | Value |
| ------------------ | ----- |
| Project Name       |       |
| Function Name      |       |
| Test Designed By   |       |
| Test Design Date   |       |
| Reference Document |       |

## Priority definitions

| Priority | Meaning                                                                               |
| -------- | ------------------------------------------------------------------------------------- |
| High     | Core/main-flow function cases, and UI issues that are immediately visible to the user |
| Medium   | Validation cases                                                                      |
| Low      | Rare/edge cases                                                                       |

## Test cases

Column groups, flattened for a Markdown table:

- **Screen/Function** → split into `Category I` / `Category II` / `Category III` (a 3-level breakdown of the screen or function being tested — e.g. screen name → section → sub-section/field group)
- **Normal/Abnormal** → whether the case exercises the normal (happy-path) flow or an abnormal/exception flow
- **Execution** → a single execution record: who ran it, when, the result (`Status` = `OK` / `NG` / `Untested` / `Block`), and, when `NG`, a `Bug ID` + `Bug Priority`.

> **Viewport scope:** the supported minimum width is **1024px**. Run layout checks at the floor (**1024×768**) first and confirm again on a wide desktop (**≥1440px**). Anything **narrower than 1024px is out of scope** — do not write phone/mobile cases, and the document keeps a **single result column**, not a per-device split.
>
> **Backend:** phase 2 — integrated screens run against the **real API** with real Cognito accounts. A case whose expected result is not met because of a documented Round 1 integration blocker is recorded as `Block` with the blocker id (see the feature's `integration-plan.md`), not `NG`.

| Test Case ID | Implemented by Developer | Category I | Category II | Category III | Normal/Abnormal | Pre-condition | Test Steps       | Expected Results | Test Data | Priority | Executed By | Execution Date | Status | Bug ID | Bug Priority | Notes |
| ------------ | ------------------------ | ---------- | ----------- | ------------ | --------------- | ------------- | ---------------- | ---------------- | --------- | -------- | ----------- | -------------- | ------ | ------ | ------------ | ----- |
| TC-001       |                          |            |             |              | Normal          |               | 1. <br>2. <br>3. |                  |           | High     |             |                |        |        |              |       |

## Execution summary (optional)

Use this section to track roll-up counts once the test pass has been executed.
All cases run at **1024px width or wider** (narrower than 1024px is out of scope). Record the viewport(s) actually used.

### By status

| Status    | Count | %   |
| --------- | ----- | --- |
| OK        |       |     |
| NG        |       |     |
| Untested  |       |     |
| Block     |       |     |
| **Total** |       |     |

### By priority

| Priority  | # Test Cases | %   | # Bugs (NG) | %   |
| --------- | ------------ | --- | ----------- | --- |
| High      |              |     |             |     |
| Medium    |              |     |             |     |
| Low       |              |     |             |     |
| **Total** |              |     |             |     |
