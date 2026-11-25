> **Status (real API, updated 2026-10-19):** this feature now runs on the real backend,
> `/api/v1/admin/terms` (API-076 §3–§8, client `src/lib/api-real`, Swagger in
> `src/lib/openapi.real.json`). The old mock BFF paths (`/crm/terms`) and mock row shapes are kept
> only as historical context. Where this file disagrees with the Swagger, **the Swagger wins**.

# Contract: Terms Document Detail

`GET /api/v1/admin/terms/{id}` (API-076 §4) — `{id}` is a UUID.

Backs US2 (detail view: Basic Information + Version History tabs), FR-010, FR-011.

## Authorization

- 401 if unauthenticated; 403 for roles without access (Trainer).
- Non-HQ roles: a document outside their brand group(s) → **404** (scope doesn't leak ids). A shared
  document (`brandEnum: null`) is visible to every brand scope.
- A logically deleted document is still viewable by id (`deletedAt` set) — FR-016.

## Response 200

```json
{
  "id": "018f3a2b-7c4d-7e91-8a02-b3c4d5e6f760",
  "parentTermsId": "018f3a2b-7c4d-7e91-8a02-b3c4d5e6f761",
  "prevTermsId": "018f3a2b-7c4d-7e91-8a02-b3c4d5e6f761",
  "termsType": "membership",
  "brandEnum": "JOYFIT",
  "title": "会員規約",
  "version": "1.2",
  "pdfS3Key": "terms/membership-1.2.pdf",
  "pdfUrl": "https://cdn.fitness-dx.example.com/public/terms/….pdf",
  "pdfFileName": "membership_terms_1.2.pdf",
  "pdfFileSize": 430080,
  "bodyText": "第1条（総則）\n...",
  "effectiveFrom": "2026-04-01",
  "effectiveTo": null,
  "displayOrder": 1,
  "requiresConsent": true,
  "remarks": "第3条の契約期間を変更",
  "status": "published",
  "relatedVersions": [
    {
      "id": "…761",
      "version": "1.1",
      "effectiveFrom": "2025-10-01",
      "effectiveTo": "2026-03-31",
      "remarks": "第3条（契約期間）の変更",
      "status": "ended",
      "isDeleted": false
    },
    {
      "id": "…760",
      "version": "1.2",
      "effectiveFrom": "2026-04-01",
      "effectiveTo": null,
      "remarks": "第3条の契約期間を変更",
      "status": "published",
      "isDeleted": false
    }
  ],
  "createdBy": "staff-uuid",
  "createdByName": "山田 太郎",
  "updatedBy": "staff-uuid",
  "updatedByName": "山田 太郎",
  "createdAt": "2026-04-01T00:00:00Z",
  "updatedAt": "2026-04-01T00:00:00Z",
  "deletedAt": null
}
```

## Behavior notes

- **No computed `versionKind` / `isCurrentlyApplied` / `relatedTermsRef` / `changeSummary` fields.** The FE derives them:
  `versionKind = parentTermsId ? 'version' : 'original'`; "currently applied" = the
  `relatedVersions` entry (non-deleted) whose `status === 'published'`; the related-terms reference
  is the original row of `relatedVersions`; the timeline's change summary is that entry's `remarks`
  (research.md #11).
- `relatedVersions` is every version of the group anchored on the original, **including this row
  and logically deleted siblings** (`isDeleted`); per-version `status` is evaluated at the same
  instant as the parent row. Slicing to "3 most recent + show more" (FR-011) is presentation only.
- PDF: `pdfS3Key` is the raw key; `pdfUrl` is the delivery URL resolved from it (API-006, §11.4),
  openable as is. `pdfFileName` / `pdfFileSize` (bytes) are derived on read from media-svc
  `upload_sessions` and are `null` only when the upload session cannot be resolved (no PDF, unknown
  key, media-svc unreachable) — the UI shows a placeholder, not an error. Only the currently-applied
  version's PDF link is shown (FR-011).
  _(The FE's bundled `openapi.real.json` snapshot predates BE commit `50b69844` and still says
  "echoes `pdfS3Key`" — regenerate the client; the BE source is authoritative.)_
- `bodyText` is always **this** document's own extracted text; the UI shows it, with this
  document's PDF name/size/preview, for every status — Published, Expired, Draft, Deleted
  (FR-010, updated 2026-10-20). The 「{version} 適用中」 badge is shown only when this document is
  Published and not deleted.
- Names: `createdByName` / `updatedByName` are display names resolved by the BE; the UI shows these,
  never the raw staff IDs.
