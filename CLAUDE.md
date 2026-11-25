# fitness-crm Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-11-13

## Active Technologies

- TypeScript 5.x (strict, no-explicit-any) + Next.js 16 (App Router), shadcn/ui, TanStack React Query 5 (via the generated `src/lib/api-real` hooks), lucide-react, Tailwind CSS v4. No react-hook-form/Zod needed (no form — the session-termination dialog takes no input). No new npm packages. (031-staff-login-history)
- Real API only — `src/lib/api-real` (already generated from `src/lib/openapi.real.json`, both `login-histories` GET and `sessions/revoke` POST already present). No mock-db surface for this feature; this screen has already fully moved off `src/app/api/_mock-db/` (see `research.md` R3). (031-staff-login-history)

- TypeScript 5.x (strict, no-explicit-any) + Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, nuqs (URL filter state) — all already in use by sibling master-data screens; no additions. (030-domain-management)
- Phase 1 — new mock table in `src/app/api/_mock-db/` (`domains`); Phase 2 — generated REST client via hey-api with zero application-code changes. (030-domain-management)

- TypeScript 5.x (strict, no-explicit-any) + Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, Amazon Cognito public API (fetch-based, via existing `use-cognito-auth.ts`) (029-password-reset)
- None owned by this feature — Amazon Cognito owns the reset-code/link lifecycle entirely (research.md R1) (029-password-reset)

## Project Structure

```text
src/app/            # Next.js App Router (pages + co-located mock API routes under src/app/api)
src/components/     # shadcn/ui primitives (ui/) + shared app components (common/, layout/)
src/hooks/ src/contexts/ src/lib/ src/providers/ src/types/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x (strict, no-explicit-any): Follow standard conventions

## Recent Changes

- 030-domain-management: Added TypeScript 5.x (strict, no-explicit-any) + Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, nuqs (URL filter state) — all already in use by sibling master-data screens; no additions.
- 031-staff-login-history: Added TypeScript 5.x (strict, no-explicit-any) + Next.js 16 (App Router), shadcn/ui, TanStack React Query 5 (via the generated `src/lib/api-real` hooks), lucide-react, Tailwind CSS v4. No react-hook-form/Zod needed (no form — the session-termination dialog takes no input). No new npm packages.
- 029-password-reset: Added TypeScript 5.x (strict, no-explicit-any) + Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, Amazon Cognito public API (fetch-based, via existing `use-cognito-auth.ts`)

  <!-- MANUAL ADDITIONS START -->
  <!-- MANUAL ADDITIONS END -->
