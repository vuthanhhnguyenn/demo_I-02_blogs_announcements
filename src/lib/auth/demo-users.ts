import { UserRole } from '@/types/permission.type';

export interface DemoAccount {
  email: string;
  /** Hardcoded on purpose: these are throwaway dev-pool accounts, and the menu never ships outside dev. */
  password: string;
  role: UserRole;
  /** 職位 label for the menu row — the authoritative one comes from `/crm/me` once signed in. */
  position: string;
}

/**
 * Seeded Cognito accounts behind the header's「デモ: ユーザー切替」menu — one per role, mirroring the
 * prototype's list (.cache/fitness-crm-ui/src/data/demo-users.ts). Switching signs in as the account
 * for real (Cognito → `/crm/login`), so every screen sees exactly what a normal login produces.
 */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    email: 'lodu4289+1@gmail.com',
    password: 'Password@123',
    role: UserRole.System,
    position: 'システム管理者',
  },
  {
    email: 'lodu4289+headquater@gmail.com',
    password: 'Password@123',
    role: UserRole.Headquarter,
    position: '本部管理者',
  },
  {
    email: 'lodu4289+manager@gmail.com',
    password: 'Password@123',
    role: UserRole.Manager,
    position: 'ブロック長',
  },
  {
    email: 'lodu4289+staff@gmail.com',
    password: 'Password@123',
    role: UserRole.Staff,
    position: '店舗責任者',
  },
  {
    email: 'lodu4289+trainer@gmail.com',
    password: 'Password@123',
    role: UserRole.Trainer,
    position: '社員トレーナー',
  },
  {
    email: 'lodu4289+observer@gmail.com',
    password: 'Password@123',
    role: UserRole.Observer,
    position: '閲覧専任',
  },
  // Seed a Cognito account for these 職位 before re-enabling them:
  // { email: '', password: '', role: UserRole.Manager, position: 'テリトリーマネージャー' },
  // { email: '', password: '', role: UserRole.Staff, position: '正社員スタッフ' },
  // { email: '', password: '', role: UserRole.Staff, position: 'FC企業管理者' },
];

/**
 * Only an environment that declares itself `development` gets the switcher. The check is an
 * allow-list rather than `!== 'production'` because the passwords above are in the bundle: an
 * environment that forgot to set the variable must hide the menu, not expose it.
 */
export function isDemoUserSwitchEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APP_ENV === 'development';
}
