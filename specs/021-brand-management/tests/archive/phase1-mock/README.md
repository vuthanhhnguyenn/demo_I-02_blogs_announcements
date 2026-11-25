# Archived — Phase 1 (mock API) test set

Archived 2026-10-05. **Do not execute or extend these documents.**

| File                                           | What it was                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `test-plan.md`                                 | Phase 1 test plan (2026-07-29), 2 units                           |
| `TC -【Fitness CRM】- [Y-07][ブランド一覧].md` | List cases, executed against the mock API                         |
| `TC -【Fitness CRM】- [Y-07][ブランド詳細].md` | Detail cases (all tabs + sheet + dialogs), executed against mocks |

Why they were retired:

- They were written from `spec.md` (2026-07-29) and the 7/23 prototype (`c909e33`). The final sources
  are **Y-07 260928_v3** and the **9/30 prototype** (`47423ec`). Those change the fee-master
  lifecycle (有効化, per-slot 未登録 card + ［＋登録］), make 費用項目名 fixed, remove the brand status
  badge, and add the その他情報 card.
- They ran against `src/app/api/_mock-db/`. The screens now run on the real backend (Round 2,
  2026-10-05).

The replacement plan is [`../../test-plan.md`](../../test-plan.md). The new TC documents are in
`../../cases/` with the `[Y-07][P2-nn]` numbering.
