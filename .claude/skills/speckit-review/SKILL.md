---
name: 'speckit-review'
description: 'Post-implementation review agent — audits implemented code against project coding rules and fixes all violations.'
argument-hint: 'Optional path, feature name, or spec ID to scope the review'
compatibility: 'Requires .specify/memory/code-rule.md in the project root'
metadata:
  author: 'dx-fitness/fitness-crm'
  source: '.github/agents/speckit.review.agent.md'
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

If `$ARGUMENTS` is non-empty, treat it as a hint about which files or feature to review (e.g. a path, a feature name, or a spec ID). Use it to scope the review. If empty, review all files changed since the last commit.

---

## Scope Detection

Determine which files to review:

1. If `$ARGUMENTS` specifies a path or feature name → review those files.
2. Otherwise, detect changed files since the last commit:
   ```bash
   git diff --name-only HEAD
   ```
   If the working tree is clean (no unstaged changes), use:
   ```bash
   git diff --name-only HEAD~1 HEAD
   ```
3. Filter to source files under `src/` only. Ignore generated files (`src/lib/api/`).

---

## Code Review

### Load Rule Sources

Read the following file in full before building the checklist:

- `.specify/memory/code-rule.md`

### Build and Evaluate Checklist

For each scoped file, check the following items. Mark each ✅ (pass) or ❌ (fail) after inspection.

```
## Code Review Checklist — <filename>

### I. Type Safety
- [ ] No `any` in production source (except generated `src/lib/api/`)
- [ ] All props typed via TypeScript interfaces or Zod-inferred types
- [ ] API types sourced exclusively from generated `types.gen.ts`
- [ ] Zod schemas co-located in `_schemas/[name].schema.ts`, not inline

### II. Component & UI
- [ ] Only shadcn primitives (`src/components/ui/`) or composites (`src/components/common/`)
- [ ] No raw hex / rgba / oklch / hsl color values in component files
- [ ] Colors reference CSS variables from `globals.css` or `tailwind.theme.css`
- [ ] All icons from `lucide-react` only (no other icon libraries)
- [ ] Responsive layout supports min-width 768px
- [ ] Date inputs use `Datepicker` component (no `<input type="date">`)
- [ ] Tables: `data-table` for stateful, shadcn `table` primitives for static-only
- [ ] Pages with API fetching wrapped in `DataStateBoundary`
- [ ] Loading states use skeleton placeholders matching the content shape
- [ ] Error states expose a user-visible recovery action (e.g. retry / refetch)

### III. Server State
- [ ] Data fetching via generated hooks from `src/lib/api/@tanstack/react-query.gen`
- [ ] `useQuery` for fetches, `useInfiniteQuery` for paginated lists, `useMutation` for writes
- [ ] No direct `fetch()` or third-party HTTP calls in components / hooks
- [ ] Query keys derived from generated option-factory helpers (no hand-crafted string keys)
- [ ] No Jotai / Zustand / Redux or any global state store
- [ ] Persistent cross-component state uses `nuqs` (URL search params)

### IV. Forms
- [ ] `react-hook-form` + `@hookform/resolvers/zod` for all multi-field forms
- [ ] Zod schema in dedicated `_schemas/[name].schema.ts` file
- [ ] Semantic fields validated in schema per type: email → `.email()`, phone → `.regex(...)`, number → `z.coerce.number()`/`z.number()` (with `min`/`max` if bounded), text/textarea → `.max(TEXT_MAX_LENGTH)` / `.max(TEXTAREA_MAX_LENGTH)` (not bare `z.string()`)

### V. File & Routing Conventions
- [ ] File suffixes correct: `.type.ts` / `.hook.ts` / `.util.ts` / `.schema.ts` / `-context.tsx`
- [ ] Navigation via `navigate()` from `@/lib/routes/routes.util` (no raw `router.push()`)
- [ ] New routes declared in `src/lib/routes/routes.config.ts`
- [ ] `'use client'` only when component genuinely needs browser APIs / DOM events / hooks
- [ ] Images use `next/image` with explicit `width`/`height` or `fill` + `sizes` (no bare `<img>`)
- [ ] Date/time display formatting uses `src/utils/date.util.ts` helpers only (no direct `date-fns` `format()` or inline formatting)
- [ ] Date arithmetic/parsing/comparison uses `date-fns` only (no moment / dayjs / luxon)

### VI. Import Order
- [ ] react → next → third-party → @/hooks → @/components → @/lib → @/types → relative
```

### Fix Violations

For each ❌ item:

1. Locate the file and exact line(s) violating the rule.
2. Apply the minimal fix that brings the code into compliance.
3. Mark the item ✅ after fixing.
4. If a violation cannot be fixed without breaking functionality, add an inline comment:
   ```
   // TODO(CODE-RULE-<SECTION>): <reason> — follow-up issue required
   ```

Do **not** refactor compliant code. Touch only the violations.

---

## Completion Report

After the review is done, output:

```
## Review & Fix — Summary

### Code Review
✅ Passed  : <N> items
🔧 Fixed   : <N> items (list each: file:line — rule violated — fix applied)
⚠️  Deferred: <N> items (list each with TODO comment reference)
```
