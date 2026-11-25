import type { Domain } from '@/app/api/_schemas/domain.schema';

// D-001/D-002/D-003 reuse the exact domain strings staff.table.ts's seed generator
// already cycles 200 staff emails through (see `const domains` in staff.table.ts),
// so these three exercise a real non-zero staffCount/linkedStaff with no changes to
// the Staff feature's seed. D-004/D-005 reuse V0's own INITIAL_DOMAINS names/domains
// and match no seeded staff email, so they exercise the zero-staffCount delete path.
export const SEED_DOMAIN_ROWS: Domain[] = [
  {
    id: 'D-001',
    name: 'ジョイフィット本部',
    domain: 'joyfit.co.jp',
    auth_provider: 'google_sso',
    created_by: 'システム管理者',
    created_at: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'D-002',
    name: 'フィット365',
    domain: 'fit365.co.jp',
    auth_provider: 'idaas',
    created_by: 'システム管理者',
    created_at: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'D-003',
    name: 'ジョイフィット24',
    domain: 'joyfit24.co.jp',
    auth_provider: 'google_sso',
    created_by: 'システム管理者',
    created_at: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'D-004',
    name: 'ヤマウチ社',
    domain: 'yamauchi.co.jp',
    auth_provider: 'idaas',
    created_by: 'システム管理者',
    created_at: '2026-02-01T09:00:00.000Z',
  },
  {
    id: 'D-005',
    name: 'ダフトクラフト',
    domain: 'daftcraft.co.jp',
    auth_provider: 'google_sso',
    created_by: 'システム管理者',
    created_at: '2026-02-01T09:00:00.000Z',
  },
];
