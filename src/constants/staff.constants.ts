/** CRM staff roles, in wire form (matches the real API's `role` enum). */
export const StaffRole = {
  SYSTEM: 'system',
  HEADQUARTER: 'headquarter',
  MANAGER: 'manager',
  STAFF: 'staff',
  TRAINER: 'trainer',
  OBSERVER: 'observer',
} as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  [StaffRole.SYSTEM]: '（非表示）',
  [StaffRole.HEADQUARTER]: '本部',
  [StaffRole.MANAGER]: 'マネージャー',
  [StaffRole.STAFF]: 'スタッフ',
  [StaffRole.TRAINER]: 'トレーナー',
  [StaffRole.OBSERVER]: '閲覧のみ',
};
