# Fitness CRM — Code Rules (Consolidated)

Consolidated from: `constitution.md`, `cursor-project-rules.mdc`, `ui-rule.mdc`, `call-api-rule.mdc`, `form-rule.mdc`, `cretial-rule.mdc`.

---

## I. Type Safety

- `any` is banned across all of `src/` except the generated `src/lib/api/` subtree.
- ESLint rule `@typescript-eslint/no-explicit-any` must be set to `error`.
- All props must be typed via TypeScript interfaces or Zod-inferred types.
- API types must be sourced exclusively from the generated `types.gen.ts`.
- Zod schemas must be co-located in `_schemas/[name].schema.ts` — no inline schemas.
- `tsc --noEmit` must exit 0 before any PR is opened.

---

## II. Component & UI

- Component sources (in priority order):
  1. `src/components/ui/` — shadcn/ui primitives (Radix-based)
  2. `src/components/common/` — shared composites (DataTable, breadcrumb, etc.)
  3. Feature-local `_components/` — only for genuinely module-specific logic
- Raw color values (hex, rgba, oklch, hsl) are forbidden in component files.
- Colors must reference CSS variables from `globals.css` or `tailwind.theme.css`.
- Icons: `lucide-react` only — no other icon libraries.
- Responsive layout: minimum viewport width 768px.
- Date inputs: use the `Datepicker` component — `<input type="date">` is forbidden.
- Tables:
  - `data-table` (`src/components/common/data-table`) for stateful tables (filter / sort / row selection).
  - shadcn `<Table>` primitives for static read-only rendering.
  - Any table with row selection (`enableRowSelection`) must pass `tableOptions.getRowId` keyed by a stable record id. TanStack Table's default row-selection state is keyed by row _index_; on a paginated/searchable list a filter or search change re-shuffles which record sits at a given index, silently reassigning the selection to a different row. When selection can survive a filter/search change, also prune it down to ids still present in the fresh result set once it arrives.
- Pages that fetch data must be wrapped in `DataStateBoundary`.
- Loading states must use skeleton placeholders matching content shape — spinners alone are insufficient for primary content areas.
- Error states must expose a user-visible recovery action (e.g. retry / refetch).
- Images: use `next/image` with explicit `width`/`height` or `fill` + `sizes` — bare `<img>` is forbidden.
- Accessibility: interactive elements must meet WCAG 2.1 AA contrast; custom widgets (dialogs, comboboxes, tables) must have keyboard navigation and ARIA roles.
- `<Select>` (`@/components/ui/select`) must always receive an `items` prop built via `toSelectItems` (`@/utils/app.util`) from the same options array used to render `<SelectItem>`s. Without it, the trigger's `<SelectValue>` can fail to resolve the label for the current `value` on first render (before the matching `SelectItem` has mounted). See `instructor-form-buffer-settings.tsx` for the pattern.

---

## III. Server State (React Query)

- All data fetching must use generated hooks from `src/lib/api/@tanstack/react-query.gen`.
- `useQuery` for fetches, `useInfiniteQuery` for paginated lists (≤ 50 records per page), `useMutation` for writes.
- Direct `fetch()` calls or third-party HTTP clients are forbidden in components and hooks.
- Query keys must be derived from generated option-factory helpers — hand-crafted string keys are forbidden.
- Global state stores (Jotai, Zustand, Redux) are forbidden.
- Persistent cross-component state must use `nuqs` (URL search params).
- React context is permitted only for ephemeral UI state (e.g. panel open/close).

---

## IV. Forms

- Use `react-hook-form` + `@hookform/resolvers/zod` for all multi-field forms.
- Zod schema must live in a dedicated `_schemas/[name].schema.ts` file — export both the schema and the inferred TypeScript type.
- If a field has a schema, its length limit is enforced **only** in the schema — never also as the HTML `maxLength` attribute on the `<Input>`/`<Textarea>`. The user must be able to type past the limit and see an inline error via `<FormMessage />`; a hard `maxLength` attribute blocks keystrokes silently, with no error shown. (A form with no schema — e.g. a single-field dialog driven by plain `useState` — has no schema to put the limit in, so `maxLength` on the element is acceptable there.)
- Fields with a semantic type must be validated accordingly in the Zod schema, not treated as a bare `z.string()`, and every validator must carry an explicit user-facing error message (no relying on Zod's default English message):
  - Email fields: `z.string().email(...)`.
  - Phone fields: `z.string().regex(<phone pattern>, ...)`.
  - Number fields: `z.coerce.number(...)` (or `z.number()`), with `min`/`max` where the domain has bounds.
  - Text fields: `.max(TEXT_MAX_LENGTH, { message: ... })` (255).
  - Textarea fields: `.max(TEXTAREA_MAX_LENGTH, { message: ... })` (1000).

---

## V. File & Routing Conventions

| Artifact          | Pattern              | Example                      |
| ----------------- | -------------------- | ---------------------------- |
| Type definitions  | `[name].type.ts`     | `member.type.ts`             |
| Custom hooks      | `[name].hook.ts`     | `use-member-filters.hook.ts` |
| Utility functions | `[name].util.ts`     | `date.util.ts`               |
| Zod schemas       | `[name].schema.ts`   | `staff.schema.ts`            |
| React contexts    | `[name]-context.tsx` | `member-filters-context.tsx` |

- Navigation must use `navigate()` from `@/lib/routes/routes.util` — `router.push()` with string literals is forbidden.
- Navigational buttons/links must be wrapped in `next/link`'s `<Link>` — using `onClick` + `router.push()`/`navigate()` on a `<button>` is forbidden. `<Link>` enables prefetching, correct `<a>` semantics, and native middle-click/ctrl-click/open-in-new-tab behavior that `onClick` handlers break.
- New routes must be declared in `src/lib/routes/routes.config.ts`.
- `'use client'` must only be used when the component genuinely needs browser APIs, DOM events, or client-only hooks — a justifying comment is required.
- Display formatting of dates/times must use the shared helpers in `src/utils/date.util.ts` (e.g. `formatDateYYYYMMDD_HHMM`, `formatDateYYYYMMDD`, `formatDateYYYYMM`, `formatTime`, `formatElapsedTime`) — calling `date-fns`'s `format()`, or any inline/manual date formatting, directly in components/pages/hooks is forbidden. Add a new helper to `date.util.ts` if the needed format doesn't exist yet, rather than formatting inline.
- `date-fns` v4 remains the only allowed library for date arithmetic, parsing, and comparison (e.g. `addMonths`, `isBefore`, `startOfDay`, `differenceInYears`) where no `date.util.ts` helper applies — moment / dayjs / luxon are banned.

---

## VI. Import Order

```
react → next → third-party → @/hooks → @/components → @/lib → @/types → relative
```

---

## VII. Two-Phase Development

- **Phase 1**: Complete UI + mock API via Next.js Route Handlers (`src/app/api/crm/`). Mock data in `src/app/api/_mock-db/` must compile against `types.gen.ts` at all times.
- **Phase 2**: Triggered after DEV-BE publishes a stable OpenAPI spec. Replace mock handlers with generated React Query hooks. `src/lib/api/` must never be edited manually.

---

## VIII. Performance

- React Server Components are the default — `'use client'` must be justified.
- `next/dynamic` is required for any component subtree > 30 kB gzip that is not on the critical render path.
- `<img>` tags are forbidden — use `next/image` only.
