import { ComingSoonPlaceholder } from '@/components/common/coming-soon-placeholder';

/**
 * `/` — the post-login landing.
 *
 * TODO(Z-01): replace with the per-role home / ダッシュボード (Phase 2, scope 2026-10-23).
 * Until it ships, render the same 「この機能は準備中です」 placeholder as `/todo`.
 * This used to `redirect('/members')`, which sent every role without member-list
 * permission (e.g. Trainer / Observer / CorporateSales) straight to 403 after login.
 */
export default function Home() {
  return <ComingSoonPlaceholder />;
}
