> **Status (real API, updated 2026-10-19):** this feature now runs on the real backend,
> `/api/v1/admin/terms` (API-076 §3–§8, client `src/lib/api-real`, Swagger in
> `src/lib/openapi.real.json`). The old mock BFF paths (`/crm/terms`) and mock row shapes are kept
> only as historical context. Where this file disagrees with the Swagger, **the Swagger wins**.

# Contract: Terms Document Mutations

| Action                    | Endpoint                                 | Ref        |
| ------------------------- | ---------------------------------------- | ---------- |
| Create (new registration) | `POST /api/v1/admin/terms`               | API-076 §5 |
| Edit                      | `PATCH /api/v1/admin/terms/{id}`         | §6         |
| Delete (logical)          | `DELETE /api/v1/admin/terms/{id}`        | §7         |
| Create new version        | `POST /api/v1/admin/terms/{id}/versions` | §8         |

Backs US3 (register), US4 (edit), US5 (new version), US6 (delete); FR-007, FR-008, FR-009,
FR-012, FR-013, FR-014, FR-016.

## Authorization (all)

- Only `System` / `Headquarter` may mutate (research.md #8, FR-017), enforced server-side; others → 403.
- 401 unauthenticated; 404 unknown / already-deleted `{id}`; 422 business-rule violation
  (e.g. `E-TERM-002` `effectiveTo < effectiveFrom`).

## PDF upload (shared by create / edit / new version)

1. `POST /api/v1/media/presign` with `tag: "terms"` (application/pdf, ≤100MB server-side; the form
   caps at 10MB, FR-008) → presigned URL + S3 key.
2. `PUT` the file to the presigned URL.
3. Send the **S3 key** as `pdfS3Key` — not a public URL. `pdfFileName` / `pdfFileSize` are **not**
   sent; the BE derives them on read.
4. The FE extracts the PDF text client-side (`src/lib/utils/pdf-text.util.ts`) and sends it as
   `bodyText`. The server never parses the PDF (method D).

**Pairing rule (§6.2 / §8.2):** a new PDF must bring its re-extracted `bodyText` in the same
request — `pdfS3Key` without `bodyText` → `400 E-VAL-001`. On edit, `bodyText` alone is allowed.
On a new version `bodyText` is required and never inherited from the source.

## `POST /api/v1/admin/terms` — Create

```json
{
  "termsType": "membership",
  "brandEnum": "JOYFIT",
  "title": "会員規約",
  "version": "v1.0",
  "pdfS3Key": "terms/membership-v1.0.pdf",
  "bodyText": "第1条…",
  "effectiveFrom": "2026-08-01",
  "effectiveTo": null,
  "displayOrder": 1,
  "requiresConsent": true,
  "remarks": null
}
```

- Required: `termsType`, `brandEnum` (key required, value may be `null`), `title`, `version`,
  `pdfS3Key`, `bodyText`, `effectiveFrom`. Optional: `effectiveTo`, `displayOrder`, `requiresConsent`, `remarks`
  (`effectiveTo` / `remarks` are strings, `null` = unset).
- `termsType`: `membership|privacy|withdrawal|suspension|payment|companion`.
- **`brandEnum`**: `"JOYFIT"` | `"FIT365"` | `null`. Explicit `null` = one shared document for both
  brand groups. Edit-locked after create.
- **Multi-brand registration** (research.md #2): both brands ticked → **one** `POST` with
  `brandEnum: null`; one brand ticked → that brand. This endpoint creates exactly one document.
- `parentTermsId` / `prevTermsId` are **not accepted** on create — a plain registration is always a new
  lineage; versions are created via `/{id}/versions`.
- Response `201` = the detail shape (`TermsDocumentDetailDto`).

## `POST /api/v1/admin/terms/{id}/versions` — Create new version

```json
{
  "title": "会員規約",
  "version": "v2.0",
  "pdfS3Key": "terms/membership-v2.0.pdf",
  "bodyText": "第1条…（改訂版）",
  "effectiveFrom": "2026-09-01",
  "effectiveTo": null,
  "displayOrder": 1,
  "requiresConsent": true,
  "remarks": "第3条を改定"
}
```

- `{id}` is the source document. The server derives `termsType`, `brandEnum` (including `null`),
  `parentTermsId` (source's parent ?? source id) and `prevTermsId` (= `{id}`) — the client never sends them.
- Required: `title`, `version`, `pdfS3Key`, `bodyText`, `effectiveFrom`.
- The previous version is auto-closed: its `effectiveTo` becomes `effectiveFrom − 1 day` (FR-015).
- Response `201` = the detail shape of the new version.

## `PATCH /api/v1/admin/terms/{id}` — Edit

```json
{
  "title": "会員規約",
  "version": "v1.1",
  "effectiveFrom": "2026-08-01",
  "effectiveTo": null,
  "displayOrder": 1,
  "requiresConsent": true,
  "remarks": "誤字修正",
  "pdfS3Key": "terms/new.pdf",
  "bodyText": "…"
}
```

- All fields optional (partial update; the FE sends only dirty fields). `termsType` and `brandEnum`
  are **not accepted** (strict schema, FR-012).
- No server-side block when editing a `published` document — FR-013's warning is a client advisory.
- Response `200` = the detail shape.

## `DELETE /api/v1/admin/terms/{id}` — Logical delete

- No body. Sets `deletedAt`; does not touch sibling versions (spec Edge Cases).
- Response `204` (no body). The FE shows its own success toast. Deleting again → `404`.
- The confirmation dialog is client-side only (FR-016).
