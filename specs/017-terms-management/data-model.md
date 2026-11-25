# Data Model: Y-04 Terms Document Master Management

**Feature**: `017-terms-management` | **Date**: 2026-07-14
**Prerequisite**: [research.md](research.md) — read decisions 1–11 first; this document assumes them.

## Entity: Terms Document (`terms` table)

One row = one version-level document (either the lineage's original, or a derived version). There
is no separate "lineage" entity — lineage membership and the "currently applied" version are both
derived at read time (research.md #1, #4).

> **Real API note (2026-10-19):** the table below is the original mock row. Against the real API:
> `id` / `parent_terms_id` / `prev_terms_id` are **UUIDs**; the PDF is `pdfS3Key` (+ derived
> `pdfUrl`, `pdfFileName`, `pdfFileSize`), not `pdf_url`/`pdf_file_name`/`pdf_file_size` columns;
> `created_by` / `updated_by` are staff IDs with `createdByName` / `updatedByName` display names;
> logical delete is `deletedAt` (list exposes `isDeleted`); status is `draft | published | ended`;
> `version_kind`, `is_currently_applied`, `relatedTermsRef` and `changeSummary` are not returned
> (derived by the FE from `relatedVersions`). See `contracts/*.md` for the exact shapes.

### Row shape (`_mock-db/types/terms.type.ts`, snake_case)

| Field              | Type                        | Notes                                                                                         |
| ------------------ | --------------------------- | --------------------------------------------------------------------------------------------- |
| `id`               | `string`                    | `TM-{NNN}`, sequential (research.md #6)                                                       |
| `parent_terms_id`  | `string \| null`            | Root/original document id; `null` on the original itself (research.md #5)                     |
| `prev_terms_id`    | `string \| null`            | The specific document this version was created from; `null` on the original (research.md #5)  |
| `terms_type`       | `TermsType`                 | One of 6 fixed values — see below                                                             |
| `brand_enum`       | `TermsBrand \| null`        | `'JOYFIT' \| 'FIT365'`, or `null` = one shared document for both brands (research.md #2, #10) |
| `title`            | `string`                    | "terms name" (規約名)                                                                         |
| `version`          | `string`                    | Free-text version label, e.g. `"v1.0"`, `"v2.1"`                                              |
| `pdf_url`          | `string`                    | Public URL from the presign upload flow (research.md #7)                                      |
| `pdf_file_name`    | `string`                    | Original filename, for FR-010's file-info display                                             |
| `pdf_file_size`    | `number`                    | Bytes, for FR-010's file-info display                                                         |
| `body_text`        | `string`                    | Extracted PDF text; mock-synthesized placeholder (research.md #3)                             |
| `effective_from`   | `string` (ISO date)         | Required; "適用開始日"                                                                        |
| `effective_to`     | `string \| null` (ISO date) | Optional; "適用終了予定日"                                                                    |
| `display_order`    | `number \| null`            | Optional                                                                                      |
| `requires_consent` | `boolean`                   | "承諾ボタン表示" (approval-button display)                                                    |
| `remarks`          | `string \| null`            | Notes on Basic Info (current version) / change summary in the timeline (research.md #11)      |
| `is_deleted`       | `boolean`                   | Logical delete flag (FR-016)                                                                  |
| `created_by`       | `string`                    | Staff display name at creation time                                                           |
| `updated_by`       | `string`                    | Staff display name at last update                                                             |
| `created_at`       | `string` (ISO datetime)     |                                                                                               |
| `updated_at`       | `string` (ISO datetime)     |                                                                                               |

### Enums

```ts
TermsTypeSchema = z.enum([
  'membership', // 会員規約
  'privacy', // プライバシーポリシー (API value; the mock used 'privacy_policy')
  'payment', // 決済規約
  'companion', // 同伴規約
  'withdrawal', // 退会規約
  'leave_of_absence', // 休会規約
]);

TermsBrandSchema = z.enum(['JOYFIT', 'FIT365']); // research.md #10; row field is TermsBrandSchema.nullable() (null = shared)

TermsStatusSchema = z.enum(['published', 'ended', 'draft']); // computed only, never stored; 'ended' = 適用終了 (the mock called it 'expired')
```

### Computed (never stored) fields, added at response time

| Field                  | Derivation                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `status`               | `now() < effective_from` → `draft`; else `effective_to` set and `now() > effective_to` → `ended`; else `published` (research.md #4) |
| `version_kind`         | `'original'` if `parent_terms_id` is `null`, else `'version'`                                                                       |
| `is_currently_applied` | Within this row's lineage group (see below), `true` iff this row's computed `status === 'published'` (research.md #4)               |

### Lineage grouping (derived, not stored)

```
lineageRootId(row) = row.parent_terms_id ?? row.id
lineage(rootId) = all non-deleted rows where lineageRootId(row) === rootId,
                  sorted by effective_from ascending
```

Used by:

- The detail page's Version History tab (FR-011): `lineage(lineageRootId(currentDoc))`.
- The "Related Terms" reference in create/new-version forms (FR-014): the source document's
  `parent_terms_id ?? source.id`, displayed as `{title} {version}` read-only.

### Validation rules (registration / edit — FR-007, FR-008, FR-012)

| Field                  | Rule                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `brand_enum`           | Required key; `JOYFIT`/`FIT365`/`null` (both ticked → one create with `null` — research.md #2)      |
| `title`                | Required, non-empty                                                                                 |
| `terms_type`           | Required; **locked** (not submittable) in edit/new-version mode                                     |
| `version`              | Required, non-empty free text                                                                       |
| `effective_from`       | Required, valid date                                                                                |
| `effective_to`         | Optional; if set, must be `> effective_from`                                                        |
| `display_order`        | Optional; integer ≥ 1 if provided                                                                   |
| `requires_consent`     | Required boolean (toggle always has a value, defaults `true` on create; copied on new-version)      |
| `remarks`              | Optional                                                                                            |
| PDF (create)           | Required; `application/pdf` only; ≤ 10MB (FR-008); sent as `pdfS3Key` + client-extracted `bodyText` |
| PDF (edit/new-version) | Optional replace on edit (new PDF requires `bodyText` too); required on new-version                 |

**Locked fields** (edit mode, FR-012) and (new-version mode, FR-014): `terms_type`, `brand_enum`.
**Pre-filled + editable** on new-version only: `title`, `display_order`, `requires_consent` (copied
from the source document, editable — FR-014; `title` unlocked 2026-10-20). `remarks` starts blank on new-version
(research.md #11).

## Seed data plan (`_mock-db/seeds/terms.seed.ts`)

Relative to `now()` so the seed always demonstrates all three computed statuses and a real lineage,
avoiding the app-maintenance precedent's "stale literal dates" mistake:

| id     | title                | type             | brand  | version | parent | effective_from | effective_to | status (derived)            |
| ------ | -------------------- | ---------------- | ------ | ------- | ------ | -------------- | ------------ | --------------------------- |
| TM-001 | 会員規約             | membership       | joyfit | v1.0    | —      | now − 400d     | now − 180d   | expired                     |
| TM-002 | 会員規約             | membership       | joyfit | v1.1    | TM-001 | now − 180d     | —            | published                   |
| TM-003 | プライバシーポリシー | privacy_policy   | fit365 | v1.0    | —      | now − 90d      | —            | published                   |
| TM-004 | 決済規約             | payment          | joyfit | v1.0    | —      | now − 60d      | —            | published                   |
| TM-005 | 決済規約（下書き）   | payment          | joyfit | v1.1    | TM-004 | now + 30d      | —            | draft                       |
| TM-006 | 同伴規約             | companion        | joyfit | v1.0    | —      | now − 200d     | —            | published                   |
| TM-007 | 退会規約             | withdrawal       | joyfit | v1.0    | —      | now − 300d     | —            | published                   |
| TM-008 | 休会規約             | leave_of_absence | joyfit | v1.0    | —      | now − 150d     | —            | published                   |
| TM-009 | 会員規約（旧版）     | membership       | fit365 | v1.0    | —      | now − 500d     | now − 100d   | expired, `is_deleted: true` |

TM-001/TM-002 exercise the core lineage + auto-expiry scenario (US5, FR-015); TM-004/TM-005
exercise a draft-pending-version scenario; TM-009 exercises the "include deleted" toggle (FR-003).
Every seed row gets a placeholder `pdf_url`/`pdf_file_name`/`body_text` so FR-009/FR-010 render
immediately without any manual upload.

## API response shapes

### List item (`GET /api/v1/admin/terms`)

```
{ id, parentTermsId, termsType, brandEnum /* nullable */, title, version, effectiveFrom, effectiveTo,
  requiresConsent, displayOrder, status, isDeleted }
```

Response envelope: `{ items, pagination: { page, limit, total, totalPages, totalAllItems? } }`.

### Detail (`GET /api/v1/admin/terms/{id}`)

```
{ id, parentTermsId, prevTermsId, termsType, brandEnum /* nullable */, title, version,
  pdfS3Key, pdfUrl, pdfFileName, pdfFileSize, bodyText, effectiveFrom, effectiveTo, displayOrder,
  requiresConsent, remarks, status,
  relatedVersions: [ { id, version, effectiveFrom, effectiveTo, remarks, status, isDeleted } ],
  createdBy, createdByName, updatedBy, updatedByName, createdAt, updatedAt, deletedAt }
```

`versionKind`, `isCurrentlyApplied`, the related-terms reference and the timeline `changeSummary`
are derived client-side from `parentTermsId` / `relatedVersions` (see `contracts/terms-detail.md`).

### Create/Update body

Create requires all FR-007 fields (`brandEnum` is a single value or `null`, never an array — research.md #2) +
`pdfS3Key` and `bodyText` (post-upload). `parentTermsId`/`prevTermsId` are never client-sent: the
server derives them in `POST /admin/terms/{id}/versions`. Update omits `termsType`/`brandEnum` entirely (not merely
ignored — same strictness precedent as `016`'s immutable-field encoding).
