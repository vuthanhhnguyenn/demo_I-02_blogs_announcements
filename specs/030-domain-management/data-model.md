# Data Model: Y-14 Domain Master Management

**Feature**: 030-domain-management | **Phase**: 1 — Design & Contracts
**Sources**: `spec.md` Key Entities + Functional Requirements; `research.md` R1–R6

---

## 1. `DomainAuthMethod` (enum)

| Value        | Japanese label | Meaning                                              |
| ------------ | -------------- | ---------------------------------------------------- |
| `google_sso` | Google SSO     | Staff on this domain authenticate via Google SSO     |
| `idaas`      | IDaaS          | Staff on this domain authenticate via the IDaaS path |

Zod: `DomainAuthMethodSchema = z.enum(['google_sso', 'idaas'])` in `src/app/api/_schemas/domain.schema.ts` (research R3 — value-compatible with, but independent of, `FranchiseCompanyAuthMethodSchema`). Japanese labels live in `DOMAIN_AUTH_METHOD_LABELS` (`src/app/(private)/domains/_constants/domain.constants.ts`), per project convention (English enum values as API/storage keys, Japanese labels display-only).

---

## 2. `Domain` (stored entity)

| Field           | Type               | Nullable | Description                                                                                   |
| --------------- | ------------------ | -------- | --------------------------------------------------------------------------------------------- |
| `id`            | `string`           | No       | System-assigned, sequential `D-0xx` (e.g. `D-001`) — research R1                              |
| `name`          | `string`           | No       | 管理名 — human-readable label for row identification and delete confirmation (FR-001, FR-004) |
| `domain`        | `string`           | No       | The bare domain portion of a staff email (no `@`); unique case-insensitive (FR-005)           |
| `auth_provider` | `DomainAuthMethod` | No       | Google SSO / IDaaS — read by Y-13's (separate, unmodified) login routing (FR-004)             |
| `created_by`    | `string`           | No       | Actor id/label at creation time; read-only thereafter (FR-009)                                |
| `created_at`    | `string` (ISO)     | No       | Set at creation; read-only thereafter (FR-009)                                                |

**Validation rules** (`DomainSchema` / create-update bodies):

- `name`: required, non-empty, trimmed, reasonable max length (reuse the project's shared `TEXT_MAX_LENGTH` constant, matching every other master-entity name field).
- `domain`: required, non-empty, trimmed, lower-cased for comparison; must not contain `@` or whitespace (FR-006) — validated with a simple bare-domain pattern (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$` case-insensitive) rather than a full email-format validator.
- `domain` uniqueness: case-insensitive, enforced on create (409) and on update excluding the record's own id (409) — research R1/spec FR-005.
- `auth_provider`: required, one of the two enum values — no default (the user must choose explicitly, matching V0's controlled `Select` with no pre-selected value... actually V0 doesn't have this field at all; the create/edit dialog requires an explicit selection since there is no sensible default per spec.md).

**Explicitly not stored in Phase 1** (research R5): no `status` / enabled-disabled field. FR-015 is deferred in full.

### Derived fields (response-only, never stored)

| Field         | Type     | Derivation                                                                                                                        |
| ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `staff_count` | `number` | Count of `staffs` rows whose `email`'s domain portion (after `@`, lower-cased) equals `domain.domain` (lower-cased) — research R2 |

---

## 3. `DomainListItem` (response-only, list projection)

| Field          | Type               | Description               |
| -------------- | ------------------ | ------------------------- |
| `id`           | `string`           |                           |
| `name`         | `string`           |                           |
| `domain`       | `string`           |                           |
| `authProvider` | `DomainAuthMethod` | camelCase in the response |
| `staffCount`   | `number`           | See §2 Derived fields     |

No `status` field (research R5).

---

## 4. `DomainDetail` (response-only, detail projection — GET by id)

Extends `DomainListItem` with:

| Field         | Type                         | Description                                                    |
| ------------- | ---------------------------- | -------------------------------------------------------------- |
| `createdBy`   | `string`                     | camelCase; read-only (FR-009)                                  |
| `createdAt`   | `string` (ISO)               | camelCase; read-only (FR-009)                                  |
| `linkedStaff` | `DomainLinkedStaffSummary[]` | Staff whose email domain matches this domain (FR-010) — see §5 |

## 5. `DomainLinkedStaffSummary` (response-only, nested in `DomainDetail`)

| Field   | Type     | Description                                                                                  |
| ------- | -------- | -------------------------------------------------------------------------------------------- |
| `id`    | `string` | Staff id (existing `staffs` table PK)                                                        |
| `name`  | `string` | Staff display name                                                                           |
| `email` | `string` | Full email address (the matching domain is implicit — it's this Domain's own `domain` value) |

Minimal by design (research R2/Constitution V) — just enough for FR-010's "表示する" requirement and for the delete-block message to be self-explanatory; no store/position/role columns added unless a future spec calls for them.

---

## 6. `GetDomainsQueryParams` (list query params)

Zod: `GetDomainsQueryParamsSchema`.

| Field          | Type                     | Default | Description                                                                |
| -------------- | ------------------------ | ------- | -------------------------------------------------------------------------- |
| `query`        | `string?`                | —       | Free-text; matches `name` or `domain` (partial, case-insensitive) (FR-002) |
| `authProvider` | `DomainAuthMethod?`      | —       | Filter by exact authentication method (FR-002)                             |
| `page`         | `number`                 | `1`     | 1-based page number                                                        |
| `limit`        | `25 \| 50 \| 100 \| 200` | `50`    | Records per page (matches V0's `PAGE_SIZE_OPTIONS`)                        |

No `sort` param — neither `spec.md` nor V0 calls for column sorting on this screen (YAGNI, research decision folded into this schema rather than a separate research entry since it mirrors R5's reasoning).

---

## 7. `GetDomainsResponse` (list response)

```
{
  items: DomainListItem[];
  pagination: { page: number; limit: number; totalItems: number; totalPages: number };
  count: number; // total domains, unfiltered — page header's "N件" badge
}
```

---

## 8. `CreateDomainBody` / `UpdateDomainBody`

Both share the same shape (full-replace on update, matching V0's form which always submits all three fields together):

| Field          | Type               | Required |
| -------------- | ------------------ | -------- |
| `name`         | `string`           | Yes      |
| `domain`       | `string`           | Yes      |
| `authProvider` | `DomainAuthMethod` | Yes      |

`created_by`/`created_at` are never client-supplied — the mock stamps them on create only.

---

## 9. `DeleteDomainResponse` (success) / error shape

Success: `{ message: string }`.
Blocked (409): `{ error: string; staffCount: number }` — the count feeds FR-013's "スタッフ数を明示して警告" requirement directly into the client's block message without a second round-trip.

---

## 10. Relationships

```text
Domain (new table)
  ⟷ Staff (existing `staffs` table, unmodified)
      matched by: staff.email's domain-suffix === domain.domain (case-insensitive)
      no stored foreign key in either direction (research R2)
```

- Delete guard: a Domain with `staff_count ≥ 1` cannot be deleted (409 + disabled UI affordance) — spec.md FR-013 / research R6.
- No relationship surface is added to the Staff schema or its endpoints; `GET /api/crm/domains/{id}` computes `linkedStaff` itself by scanning `staffs` (small scale — no new indexed lookup structure needed).

## 11. State transitions

Stateless master data — no status field in Phase 1 (research R5). Lifecycle: created → (edited ×n) → physically deleted (only when `staff_count === 0`). Authentication-method changes take effect on the affected staff's next login per spec.md FR-011 — this is a Y-13-side read-time effect (research R8), not a state machine Y-14 itself needs to model.
