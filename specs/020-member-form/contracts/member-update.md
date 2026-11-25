# Contract: Member load & personal-info update (020-member-form)

**Consumer**: `/members/[id]/edit` page · **Provider**: mock API routes under `src/app/api/crm/members/` (Phase 1), generated client `src/lib/api/` as the only call path.

> Backend follow-up (Q10): the published design `fitness-dx CRM API 0.8.0` exposes **no** PII-update endpoint (`/api/v1/admin/members/{memberId}` is GET-only). This contract is the project-local mock shape; realign the transport layer when the real endpoint is published. The screen-facing behaviour below is stable either way.

## 1. Load (prefill)

`GET /crm/members/{id}` — generated helper `getCrmMembersByIdOptions`

- **200** `GetMemberDetailResponse` — used fields: `personalInfo.{lastName, firstName, lastNameKana, firstNameKana, gender, dateOfBirth, phone, email, postalCode, prefecture, city, streetAddress, building}`, `memberStatus`.
  - Address prefill: join `[prefecture, city, streetAddress, building]` non-empty parts into the single 住所 box (Q11 — prototype wins; decomposition is not the form's concern).
  - `gender` may now be `no_answer` (4-value enum) — form shows 回答しない.
  - `memberStatus ∈ {withdrawn, force_withdrawal}` → withdrawn block screen (FR-033), form never mounts.
- **404 / error** → shared error state with retry (FR-030).

## 2. Save

`PATCH /crm/members/{id}` — generated helper `patchCrmMembersByIdMutation`

Request body (**exactly this subset** — FR-024/Q10):

```jsonc
{
  "basic_info": {
    "name_kanji": "山田 太郎", // "{last} {first}", trimmed
    "name_kana": "ヤマダ タロウ", // "{lastKana} {firstKana}", trimmed
    "gender": "no_answer", // male | female | other | no_answer
    "birthday": "1990-05-20",
    "postal_code": "1500001", // normalized to digits; "" when blank (clears stored value)
    "address": "東京都渋谷区神宮前1-1-1", // trimmed; "" when blank (clears stored value)
    "prefecture": "", // Q11: decomposed parts always cleared —
    "city": "", // the whole address lives in `address`
    "building": "", // so the next load's join stays stable
    "phone": "09012345678", // digits only; an E.164 number keeps its "+" ("+84901234567") — API-093 §18.3 v0.14
    "email": "yamada@example.com",
  },
  // profile_info, emergency_contact, notes: NEVER sent — server keeps stored values
}
```

- **200** `UpdateMemberResponse` (full member detail) → invalidate member-detail + members-list queries → toast 「会員情報を更新しました」 → navigate to `/members/[id]` (FR-024).
- **400** (server-side schema rejection) / **network error** → toast 「会員情報の更新に失敗しました」, stay on form, values intact, dirty preserved (FR-031).
- Partial-update semantics: fields absent from `basic_info` are left unchanged by the mock (`updateBasicInfo` merge) — guarantees the never-sent attributes survive.

## 3. Schema changes required (provider side)

| File                                    | Change                                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/app/api/_schemas/member.schema.ts` | `GenderSchema`: `z.enum(['male','female','other'])` → `z.enum(['male','female','other','no_answer'])` |
| `src/lib/api/types.gen.ts`              | Surgical edit: `Gender` const += `NO_ANSWER: 'no_answer'` (justified in plan.md Complexity Tracking)  |
| `src/app/api/_mock-db/` seeds           | Optional: at least one seeded member with `gender: 'no_answer'` for manual verification               |

## 4. Explicit non-calls

- **No** change-history write (`…/change-history` stays read-only, seed data — FR-028/Q8).
- **No** `profile_info` in any request from this screen.
- **No** calls when the page shows permission-denied (FR-032) — role check precedes fetch usage of the mutation; the server additionally rejects non-HQ/System saves (FR-027).
