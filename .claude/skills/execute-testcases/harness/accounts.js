// Test-account pool for execute-testcases runs (real Cognito, shared dev pool).
//
// Cognito keeps at most 3 live sessions per account — a 4th login evicts the oldest, so
// parallel sub-agents (or a teammate) sharing one account get logged out mid-run. Give
// every agent its own slot: agent #1 uses slot 1, agent #2 slot 2, ... and never share.
//
//   const { account } = require('../accounts');
//   module.exports = loginSteps(account('manager', 2).email);
//
// All accounts use password `Password@123`. Never change their password or deactivate them.
const PASSWORD = 'Password@123';

// Seeded for QA (2026-10-14). Store affiliation as seeded — confirm data scope by what the
// logged-in session shows, not from this table.
const POOL = {
  headquarter: [1, 2, 3].map((n) => `lodu4289+test_hq_${n}@gmail.com`), // 本部管理者 (Headquarters Admin) · S-003 JOYFIT 横浜
  manager: [1, 2, 3].map((n) => `lodu4289+test_manager_${n}@gmail.com`), // ブロック長 (Block Manager) · S-008 FIT365 仙台 (閉店)
  staff: [1, 2, 3].map((n) => `lodu4289+test_staff_${n}@gmail.com`), // 正社員スタッフ · S-003 JOYFIT 横浜
  trainer: [1, 2, 3].map((n) => `lodu4289+test_trainer_${n}@gmail.com`), // 社員トレーナー (Employee Trainer) · S-003
  observer: [1, 2, 3].map((n) => `lodu4289+test_observer_${n}@gmail.com`), // 閲覧専任 (View-only Specialist) · S-003
};

// The original one-per-role accounts (also behind the app's「デモ: ユーザー切替」menu, so
// humans use them too). Only System has no pool slot; prefer POOL for everything else.
const SHARED = {
  system: 'lodu4289+1@gmail.com', // システム管理者
  headquarter: 'lodu4289+headquater@gmail.com', // 本部管理者
  manager: 'lodu4289+manager@gmail.com', // ブロック長
  staff: 'lodu4289+staff@gmail.com', // 店舗責任者
  trainer: 'lodu4289+trainer@gmail.com', // 社員トレーナー
  observer: 'lodu4289+observer@gmail.com', // 閲覧専任
};

function account(role, slot = 1) {
  const emails = POOL[role];
  if (!emails) {
    if (SHARED[role]) return { email: SHARED[role], password: PASSWORD };
    throw new Error(`Unknown role "${role}"`);
  }
  const email = emails[slot - 1];
  if (!email) throw new Error(`No ${role} slot ${slot} (pool has ${emails.length})`);
  return { email, password: PASSWORD };
}

module.exports = { PASSWORD, POOL, SHARED, account };
