# Research: Banner List Management (010)

> Phase 0 output — all planning uncertainties resolved for Phase 1 implementation.

## Decisions

### D1. List Page Architecture

**Decision**: Model the banner list route after the existing surveys list pattern (`PageHeader` + `DataTable` + filters hook + pagination footer + delete dialog).

**Rationale**: This pattern already aligns with sorting, row actions, and role-gated controls, reducing implementation risk and ensuring consistency.

**Alternatives considered**:

- Build with plain shadcn `Table` and custom pagination logic — rejected due duplicated table/sorting behavior already solved by `DataTable` stack.

---

### D2. Filter State Management

**Decision**: Use `nuqs` query-state (`page`, `limit`, `query`, `brandEnum`, `channel`, `status`, `sort`, `order`) with debounced search and reset-to-page-1 semantics.

**Rationale**: Existing feature hooks use this approach and it directly satisfies FR-018.

**Alternatives considered**:

- Local `useState` only — rejected because URL state persistence/back-forward navigation is expected in current codebase patterns.

---

### D3. Role Gating Strategy

**Decision**: Keep action controls visible and disabled for unauthorized roles using `RoleGatedButton` / `RoleGatedMenuItem`; enforce route-level access via permission mapping + proxy middleware.

**Rationale**: Matches FR-002/FR-003 and the project’s permission architecture.

**Alternatives considered**:

- Hide unauthorized actions entirely — rejected because spec explicitly requires visible-but-disabled controls.

---

### D4. Banner Thumbnail Fallback

**Decision**: Implement a dedicated thumbnail component using `next/image` with an error fallback to a neutral placeholder box labeled `画像なし`.

**Rationale**: Resolves spec Q1 and keeps image failure behavior deterministic without layout shift.

**Alternatives considered**:

- Keep broken image icon from browser default — rejected for inconsistent UX.

---

### D5. Delete Flow

**Decision**: Use `AlertDialog` with destructive confirm button and title/body text from spec; delete mutation invalidates list query and shows toast.

**Rationale**: Consistent with existing delete-dialog pattern (`surveys`) and fulfills FR-011.

**Alternatives considered**:

- Inline row delete without confirmation — rejected because destructive confirmation is mandatory.

---

### D6. Display-Order Dialog Behavior

**Decision**: Maintain a local draft order state in dialog; up/down applies immediate local swap, numeric input only updates staged value, and persistence occurs only on `保存する`.

**Rationale**: Directly matches resolved Q3 and avoids partial-state server updates while editing.

**Implementation note**: The dialog fetches banners via a dedicated `getCrmBannersOptions({ query: { limit: 200, sort: 'order', order: 'asc' } })` call (enabled only while the dialog is open), so it lists up to the first 200 banners by order rather than a literal unbounded "all banners" fetch. This is acceptable under the Phase 1 assumption that the dataset stays under 200 items.

**Alternatives considered**:

- Immediate reorder API call per input change — rejected due unnecessary complexity and noisy network writes.

---

### D7. Reorder API Contract

**Decision**: Add explicit bulk reorder endpoint (`PATCH /api/crm/banners/display-order`) accepting `{ banners: [{ id, order }] }`.

**Rationale**: Enables one atomic save from dialog and maps naturally to staged local state.

**Alternatives considered**:

- Reuse per-item PATCH endpoint repeatedly — rejected due multiple calls and race-condition risk.

---

### D8. Pagination + Empty States

**Decision**: Use existing pagination footer component with supported sizes `25/50/100/200`; render `Empty` variant `filtered` with clear action when filters are active, else `empty`.

**Rationale**: Meets FR-016..FR-019 and aligns with app-wide UX patterns.

**Alternatives considered**:

- Custom empty placeholders in page — rejected due duplicated visuals/components.

---

### D9. Permission Modeling for Banners

**Decision**: Introduce banner permission enums (view/create/edit/delete/reorder) and wire to `PAGE_PERMISSIONS` + role matrices.

**Rationale**: No banner permissions currently exist; feature requires both page-level and action-level gating.

**Alternatives considered**:

- Reuse unrelated permissions (e.g., campaigns) — rejected because it weakens authorization clarity.

---

### D10. Route Wiring

**Decision**: Create `src/app/(private)/banners/page.tsx` and regenerate typed route config via `npm run generate-routes`; never hand-edit generated route config.

**Rationale**: Route config file is generated and should remain source-of-truth from filesystem.

**Alternatives considered**:

- Manual edit of generated routes file — rejected (non-durable).
