# Contract: GET /api/crm/entry-exit-logs/{id}/quick-view (extended, shared with feature 013)

**Feature**: 015-entry-exit-history (B-01-01), extending an endpoint owned by 013-entry-exit-management
**Phase**: Phase 1 mock route handler (schema change only — route handler logic is unchanged)
**Purpose**: Power the row-click Quick View panel (FR-012), reusing feature 013's existing `member-quick-view-sheet.tsx` and its backing endpoint as-is (Decision R7).

---

## What changes vs. the existing (013) contract

Only `MemberQuickViewSchema.context`'s type changes, from the shared `EntryExitDirectionSchema` (`'entry' | 'exit'`) to a new, dedicated `QuickViewContextSchema` (`'entry' | 'exit' | 'in-building' | 'denied'`). `GetEntryExitLogsQuerySchema.direction` (013's activity-feed direction filter) is untouched — it keeps using `EntryExitDirectionSchema`.

No request shape, route path, or route handler query logic changes. Feature 013's existing calls (`activity-table.tsx` → `member-quick-view-sheet.tsx`) continue to receive `context: 'entry'` or `context: 'exit'` exactly as before.

### How this feature calls it

`GET /api/crm/entry-exit-logs/{id}/quick-view`, where `{id}` is:

- the visit's `exit_log_id`, when `visit_status === 'completed'` → response `context: 'exit'` (renders "退館済み", matching the UI prototype's row-click behavior for history rows).
- the visit's `entry_log_id`, when `visit_status === 'in_progress'` → response `context: 'in-building'` (renders "在館中").
- the visit's `entry_log_id`, when `visit_status === 'denied'` → response `context: 'denied'` (renders "入館拒否").

---

## Response 200 (new `context` values only — other fields unchanged from 013's contract)

```json
{
  "member_id": "MEM-3750006234",
  "name": "山本大輔",
  "furigana": "ヤマモトダイスケ",
  "gender": "male",
  "avatar_url": "/avatars/11.jpg",
  "context": "in-building",
  "occurred_at": "2026-07-08T04:15:00.000Z",
  "contract_name": "ナイトクレジット会員(相互利用なし)",
  "contract_id": "3750006234",
  "frequency_badge": null,
  "companion_role": null,
  "phone": "090-1234-5678",
  "email": null,
  "recent_visits": []
}
```

---

## Behavioral Rules

1. The Quick View panel's own status-badge label mapping must add two cases: `'in-building'` → "在館中", `'denied'` → "入館拒否" — alongside the existing `'entry'` → "入館" and `'exit'` → "退館済み".
2. All other quick-view fields (contract, contact info, recent visits) are computed exactly as feature 013 already implemented — this feature does not change that logic.

---

## Contract Tests (minimum, additive to 013's existing tests for this endpoint)

- New path: requesting quick-view for an in-progress visit's `entry_log_id` returns `context: "in-building"`.
- New path: requesting quick-view for a denied record's `entry_log_id` returns `context: "denied"`.
- Regression: 013's existing `context: "entry"`/`context: "exit"` cases are unaffected by the schema split.
