# Contract: POST /api/crm/entry-exit-logs/export

**Feature**: 015-entry-exit-history (B-01-01)
**Phase**: Phase 1 mock route handler

> **Superseded 2026-11-02** — this Phase 1 mock contract is no longer used. The screen calls the real API-105 async export job (`POST /api/v1/admin/access-logs/exports` → `GET /api/v1/admin/access-logs/exports/{exportId}` → presigned URL); see spec FR-016 / FR-019.

**Purpose**: Export the currently filtered history record set as a downloadable CSV file, keeping the applied search/filter conditions (FR-013, FR-016).

---

## Request

`POST /api/crm/entry-exit-logs/export`

### Body

Same shape as `GetEntryExitHistoryQuery` (see [get-entry-exit-history.md](get-entry-exit-history.md)), omitting `page` and `limit` — filters and sort only:

```json
{
  "search": "田中",
  "date_from": "2026-11-01",
  "date_to": "2026-11-30",
  "store_id": "store-fit365-yashio",
  "auth_method": "qr",
  "result": "success",
  "sort_by": "visit_date",
  "sort_order": "desc"
}
```

An empty body (`{}`) exports every row currently visible to the caller's store scope, unfiltered.

### Authorization

Requires `Permission.EntryExitHistoryExport` (FR-014), enforced client-side only: the button that triggers this request is disabled for callers without the permission (`RoleGatedButton`). The route itself performs no server-side permission check — matching every existing export route in this codebase (`equipment/export`, `controllers/export`, `training-equipment/export`), none of which check permissions server-side either (research.md R11). This is a known, pre-existing, app-wide characteristic, not a gap specific to this feature.

---

## Response 200 — real CSV file, not JSON

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="entry_exit_history_20260708.csv"

<CSV body, UTF-8 BOM-prefixed, one row per visit>
```

Built server-side via `buildCsv(headers, rows)` + `csvFileResponse(csv, filename)` (`src/app/api/_lib/csv.ts`) — the same helper `equipment`/`controllers`/`training-equipment`'s export routes already use (Decision R4). This is a real file the browser can save directly; the response body is **not** a JSON envelope.

CSV columns (header row, in order): 会員ID, 氏名, ふりがな, 性別, 来館日, 入館時刻, 退館時刻, 在館時間(分), 状態, 契約名, 所属店舗, 入館店舗, 認証方式, 処理結果 — one row per `HistoryVisitRow`, applying the same blank-value rules as the on-screen table (FR-010): `exit_time`/`stay_duration_minutes` columns are empty for `in_progress`/`denied` rows.

Filename pattern: `entry_exit_history_<YYYYMMDD>.csv` (today's date, via `csvDateStamp()`), matching `equipment_<YYYYMMDD>.csv`'s convention.

## Response 200 (empty)

Still a real CSV file — header row only, zero data rows — matching how `equipment`/`training-equipment`'s export routes behave for a zero-row filtered set (no special-cased error or empty-JSON response).

---

## Response 500

```json
{ "error": "Failed to export entry-exit history" }
```

---

## Behavioral Rules

1. Filtering logic is identical to `GET /crm/entry-exit-logs/history` (implemented via the same shared filter function/table method, applied without the `page`/`limit` slice) — the exported rows MUST always match what the on-screen table would show for the same filters (FR-013).
2. Results remain scoped to `getAllowedStoreIds(user)` — a Manager cannot export another manager's stores by omitting `store_id`.
3. No dataset-size branching — this endpoint always returns the full CSV in one response regardless of row count (FR-016).
4. The response is a real file (`Content-Type: text/csv`, `Content-Disposition: attachment`) — the client MUST call the generated mutation with `parseAs: 'blob'` and MUST NOT attempt to parse the response body as JSON.

---

## Client Consumption Pattern

```ts
// _hooks/use-entry-exit-history-csv-export.hook.ts
const { data, response } = await postCrmEntryExitLogsExport({
  body: exportQueryParams,
  parseAs: 'blob',
  throwOnError: true,
});
const filename = getCsvFilenameFromContentDisposition(
  response.headers.get('content-disposition'),
  'entry_exit_history.csv',
);
downloadCsv(data as Blob, filename); // downloadCsv passes a Blob straight through — BOM is already server-side
toast.success('CSVを出力しました');
```

Matches `equipment-csv-export-button.tsx`/`training-equipment-csv-export-button.tsx` exactly.

---

## Contract Tests (minimum)

- Happy path: filters matching the list endpoint's filter tests produce a CSV whose data rows match that same filtered set (minus pagination).
- File-shape path: response has `Content-Type: text/csv; charset=utf-8` and a `Content-Disposition: attachment; filename="..."` header — not a JSON content type.
- Scope path: caller's store scope is applied even when `store_id` is omitted.
- Empty path: a filter combination matching nothing returns a valid CSV file with only the header row, not an error.
- Blank-value path: an in-progress or denied row's exit-time/duration columns are empty in the CSV, matching the on-screen table.
- Permission path: enforced client-side only (`RoleGatedButton`) — matching every other export route in this codebase, this endpoint does not itself reject a caller lacking `EntryExitHistoryExport` (research.md R11); a caller without it simply never has a working button to click.
