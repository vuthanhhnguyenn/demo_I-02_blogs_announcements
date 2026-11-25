# GET /crm/notices/{id} (mock) ↔ GET /api/v1/admin/notices/{noticeId} (real)

## Path / query

| Param     | Type   | Real?                    | Notes                                                                                              |
| --------- | ------ | ------------------------ | -------------------------------------------------------------------------------------------------- |
| `id`      | string | yes                      | Article id                                                                                         |
| `storeId` | string | **no — mock seam BD-05** | Header store; when set and the article does not reach it → 404. Removed in Phase 2 (token scoping) |

## 200 — `NoticeDetail`

See data-model.md. Returned for deleted articles too (`deletedAt` set — gap BD-01). The client treats `type !== 'blog'` as not found.

## 404

Unknown id, or not reaching `storeId`. Body: shared mock `ErrorResponse { error }`. (Real: `ErrorResponseDto { code }`; UI branches on HTTP status / `code`, never on message text.)

## Mutations used by the screen (already implemented in blog-list)

- `PATCH /crm/notices/{id}/publish-status` `{ publishStatus: 'unpublished' }` — 非公開にする / 予約を取り消す (contracts in `specs/blog-list/contracts/notice-row-actions.md`).
- `DELETE /crm/notices/{id}` — 204.
- `POST /crm/notices/{id}/restore` — 200 (gap B-06 / BD-06).

On success the client invalidates the detail key and the list key.
