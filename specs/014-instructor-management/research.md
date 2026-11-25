# Research: D-04 Instructor Management

**Scope**: Resolve unknowns needed to design the data model, API contracts, and page structure for full instructor CRUD (list, create, detail, edit, deactivate/delete, change history).

---

## 1. Existing instructor surface must be extended, not replaced

**Decision**: Extend the existing `db.instructors` table (`src/app/api/_mock-db/types/instructors.type.ts`) and `GET /crm/instructors` route in place, adding new optional fields and query params. Do not rename or remove the existing route.

**Rationale**: `GET /crm/instructors` already exists and is consumed by the generated client (`src/lib/api/sdk.gen.ts:748`, `getCrmInstructors`) for the D-01 lesson-schedule instructor picker (`GetInstructorsQuerySchema`/`GetInstructorsResponseSchema` in `src/app/api/_schemas/lesson-schedule.schema.ts`). Its current shape is minimal: `{ instructor_id, instructor_name, store_id, role, photo_url }`, filterable by `store_id`/`role`. D-04 needs a much richer shape (nickname, romaji name, multi-role, status, brand, buffer settings, etc.) plus tab/search/filter query params.

**Approach**:

- Add new fields to `InstructorListItem` as **optional/additive** so the D-01 picker's existing usage (which only reads `instructor_id`, `instructor_name`, `photo_url`) keeps working unchanged.
- Add new optional query params (`tab`, `search`, `brand`, `status`) alongside the existing `store_id`/`role` params; when the new params are absent (as D-01's call will continue to be), list behavior for D-01 is unchanged.
- Add all other D-04 endpoints (detail, create, update, status toggle, delete, history) as new routes under `/crm/instructors/{id}/...` — no impact on the existing picker.

**Alternatives considered**: Creating a parallel `/crm/instructor-profiles` resource — rejected, it would duplicate the identity/id space and force the UI/API to reconcile two instructor lists (the picker and the management list must reference the same IDs since D-01 selects from these same instructors).

---

## 2. Role classification vocabulary

**Decision**: `role_classifications: Array<'trainer' | 'instructor' | 'body_care_therapist'>` (min 1 required), distinct from the CRM `StaffRole` enum (`system/headquarter/manager/staff/trainer/observer`) used for permissions.

**Rationale**: Spec's "Role Classification" key entity (Trainer / Instructor / Body-Care Therapist) describes what the instructor _does_, and is unrelated to `StaffRole`, which describes the _permission role of the logged-in CRM user_. The existing `instructors.type.ts` stub's `role: string` field conflates these — it must be renamed/typed as `role_classifications` to avoid confusion with `StaffRole`.

**Alternatives considered**: Reusing `StaffRole` values for role classification — rejected, the vocabularies don't overlap (`headquarter`/`manager`/`observer` make no sense as an instructor's discipline).

---

## 3. Brand derivation for list display and filtering

**Decision**: Brand(s) shown/filtered on the instructor list are computed at read-time from the instructor's assigned lesson schedules (`db.lessons`/`lesson.table.ts`), not stored on the instructor record: `instructor -> assigned lesson schedules -> studio -> store.brand` (`store.schema.ts` `brand` field, `BrandSchema` enum: `joyfit`/`joyfit24`/`joyfit_yoga`/`joyfit_plus`/`fit365`), deduplicated.

**Rationale**: Spec explicitly states "Assigned store/brand are not stored on this entity; they are derived from schedule assignments" (Key Entities, Out of Scope). An instructor with zero assigned schedules has an empty brand list; the list/filter UI must handle that as a valid empty state, not an error.

**Alternatives considered**: Storing a denormalized `brand_ids` snapshot on the instructor row, refreshed on schedule changes — rejected as premature caching; Phase 1 mock data volume doesn't need it, and it would drift from the "derived, not stored" design decision the spec calls out.

---

## 4. CRM account link picker reuses existing staff search

**Decision**: The "link CRM account" search-by-staff field in create/edit calls the existing `GET /crm/staffs?search=` endpoint (`GetStaffsQuerySchema`, `src/app/api/_schemas/staff.schema.ts:429`) rather than a new endpoint. The instructor record stores only `linked_staff_id` (nullable); display name/role are resolved via a join at detail-read time against `db.staffs`.

**Rationale**: Staff search-by-name/ID already exists and matches FR-008 exactly. No new endpoint or duplicated search logic is needed.

**Alternatives considered**: Denormalizing linked staff name onto the instructor row — rejected, it would go stale if the staff record's name changes; a join at read time is one extra lookup against an in-memory table and keeps a single source of truth.

---

## 5. Performance summary and reservation-rate data

**Decision**: Performance summary (weekly lesson count, average reservation rate, average rating, monthly participant count) is computed in the detail route handler by aggregating the instructor's assigned lesson schedules and their `reservation_rate` fields already seeded in `src/app/api/_mock-db/seeds/lesson.seed.ts`. Average rating is a new mock field (no rating feature exists yet — FR-020/D-Q09 marks this as display-only, pending a real rating source) seeded as a static per-instructor number in Phase 1.

**Rationale**: No dedicated instructor-performance aggregation exists today; lesson/reservation data already carries the raw numbers needed to compute lesson count and reservation rate. Rating has no real source yet per spec's explicit open question, so it is treated as inert mock data, matching FR-020's "display-only pending rating source decision."

**Alternatives considered**: Building a full rating subsystem — explicitly out of scope per spec (D-Q09 unresolved).

---

## 6. Role-based data scope and field editability enforcement

**Decision**: Enforce data scope (System/Headquarter: all; Manager: managed stores; Staff/Observer: own store; Trainer: self only) and field editability (Trainer can't edit `name`/`role_classifications` on self) **server-side** in the route handlers, following the `db.instructors.getList/getById` filtering pattern, not just client-side gating.

**Rationale**: Existing studio routes only mock the role as a hardcoded constant (`const mockRole: StaffRole = 'headquarter'` in `studios/route.ts`) and rely on client-side `RoleGatedButton`/`canPerformAction` gating — a known gap. D-04's spec explicitly calls out data-scope restriction as a functional requirement (FR-005) and an edge case ("Trainer opens detail for another instructor"), so Phase 1 should enforce it in the mock route handler using the same `mockRole`-style placeholder (to be replaced by real auth context in Phase 2), rather than repeating the studios gap.

**Alternatives considered**: Client-only gating matching the studios precedent — rejected because FR-005 and SC-005 both require server-verifiable scope restriction ("never exposed as usable... during testing"), and a client-only check does not satisfy that for a Trainer directly requesting another instructor's ID.

---

## 7. Delete guardrail source

**Decision**: `assigned_schedule_count` is computed the same way as the brand derivation (count of the instructor's active assigned lesson schedule rows in `lesson.table.ts`), returned in the detail payload, and re-validated server-side on `DELETE` (not just disabled client-side) — mirroring the `assigned_lesson_count` guard pattern already used in `011-studio-detail-page`.

**Rationale**: Matches FR-017 and edge case "deletion must be blocked every time, not just warned," plus the precedent set by the studio detail delete guard.

---

## 8. Status toggle as a dedicated endpoint

**Decision**: Activate/Deactivate is a dedicated `PATCH /crm/instructors/{id}/status` endpoint rather than folded into the general `PUT` update, so the status-card action on the detail page (FR-016) is a single-field, single-purpose call independent of the full edit-form validation path.

**Rationale**: Keeps the "toggle status" quick action (no confirmation dialog needed per spec — just a toast) decoupled from the "edit profile" flow (which does require a confirmation dialog per FR-009). Reusing `PUT` would force the client to always send a full valid payload just to flip status.

**Alternatives considered**: Reusing `PUT /crm/instructors/{id}` with a partial body — rejected, mixes two different UX flows (silent toggle vs. confirm-then-save) behind one endpoint.

---

## 9. Change history storage

**Decision**: Field-level change history entries are appended server-side inside the `PUT` (update) and `POST` (create) handlers into a per-instructor history array on the mock table (same pattern as `BrandsType._changeHistories` in `src/app/api/_mock-db/types/brands.type.ts`), exposed via `GET /crm/instructors/{id}/history`.

**Rationale**: Directly mirrors an existing, working pattern in the codebase (`brands.type.ts` change-history array) and the `011-studio-detail-page` `GetStudioHistoryResponse` contract shape, so no new pattern is introduced.

---

## Summary of resolved unknowns

| Unknown                                     | Resolution                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Relationship to existing `/crm/instructors` | Extend in place, additive fields/params only                                             |
| Role classification vocabulary              | New `role_classifications` enum, distinct from `StaffRole`                               |
| Brand source for list/filter                | Derived from assigned schedules → studio → store.brand, not stored                       |
| CRM account link search                     | Reuse `GET /crm/staffs?search=`                                                          |
| Performance summary data source             | Aggregate existing lesson/reservation seed data; rating is static mock pending D-Q09     |
| Data scope / field editability enforcement  | Server-side in Phase 1 mock routes (gap vs. studios precedent, deliberately closed here) |
| Delete guardrail                            | `assigned_schedule_count`, enforced server-side on DELETE                                |
| Status toggle                               | Dedicated `PATCH .../status` endpoint                                                    |
| Change history storage                      | Per-instructor history array on mock table, same pattern as `brands.type.ts`             |
