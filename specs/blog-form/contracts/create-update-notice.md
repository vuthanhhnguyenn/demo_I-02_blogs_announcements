# POST /crm/notices · PATCH /crm/notices/{id} (mock) ↔ POST/PATCH /api/v1/admin/notices[/{noticeId}] (real)

The real request schemas are not published in swagger; field names follow the real `NoticeDto` and the rules quoted in the real operation descriptions (research F1).

## Body

| Field                                      | POST                          | PATCH                        | Real?               | Notes                                    |
| ------------------------------------------ | ----------------------------- | ---------------------------- | ------------------- | ---------------------------------------- |
| `type`                                     | required (`blog`)             | —                            | yes                 |                                          |
| `title`                                    | required                      | optional                     | yes                 | ≤ 255                                    |
| `body`                                     | required                      | optional                     | yes                 | HTML                                     |
| `categoryId`                               | optional/null                 | optional/null                | yes                 |                                          |
| `thumbnailS3Key`                           | optional/null                 | optional/null                | yes                 |                                          |
| `brandScope`, `brandCode`, `subBrandCodes` | required                      | optional (merged validation) | yes                 | `subBrandCodes: []` → 422 (E-NTC-003)    |
| `storeScope`, `targetStoreIds`             | required                      | optional                     | yes                 | `targetStoreIds` replaced only when sent |
| `channelWeb`, `channelApp`                 | required                      | optional                     | yes                 | ≥ 1 true                                 |
| `publishStatus`                            | `draft\|scheduled\|published` | optional                     | yes                 | omitted on PATCH = unchanged             |
| `publishStartAt`                           | scheduled: required future    | optional                     | yes                 | 422 (E-NTC-009)                          |
| `publishEndAt`                             | optional                      | optional                     | yes                 | > start (E-NTC-009)                      |
| `expectedUpdatedAt`                        | —                             | optional                     | yes                 | mismatch → 409 (E-NTC-012)               |
| `targetStores` `{id,name}[]`               | store scope                   | store scope                  | **mock-only BF-01** |                                          |
| `operator` `{staffId,name}`                | optional                      | optional                     | **mock-only BF-02** | sets createdBy/updatedBy (+names)        |

## Responses

- 200 → `NoticeDetail` (same as `GET /crm/notices/{id}`).
- 400 invalid body; 404 unknown / deleted (PATCH); 409 stale `expectedUpdatedAt`; 422 rule violation. Body: mock `ErrorResponse { error }` (real: `ErrorResponseDto { code }` — UI must branch on status / code, not text).
