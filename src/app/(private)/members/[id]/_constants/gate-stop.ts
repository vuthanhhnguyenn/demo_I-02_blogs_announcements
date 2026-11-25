import type { MemberGateStopDto, SetGateStopDto } from '@/lib/api-real/types.gen';

type GateStopPattern = NonNullable<MemberGateStopDto['pattern']>;
type GateStopSetPattern = SetGateStopDto['pattern'];

/**
 * The patterns the 設定 form offers. A-01 FR-014 defines four, but
 * 常時入退館（ストップなし）is the *absence* of a gate stop, not a setting: the API
 * rejects it (`always_open` is not in `SetGateStopDto['pattern']`) and the screen already has
 * a dedicated 解除 action, so it is left out here on purpose
 * (backend design answer 2026-08-10, QA03 §2.2).
 *
 * Labels for all four (including the one omitted here) live in
 * `GATE_STOP_PATTERN_LABELS` below, which display code uses.
 */
export const GATE_STOP_SET_PATTERN_OPTIONS: ReadonlyArray<{
  value: GateStopSetPattern;
  label: string;
  description: string;
}> = [
  {
    value: 'staffed_hours_deny',
    label: 'スタッフ常駐時間のみ入館不可',
    description: 'スタッフがいる時間帯は入館を制限',
  },
  {
    value: 'always_deny',
    label: '常時入館不可',
    description: '全ての時間帯で入館を制限',
  },
  {
    value: 'unstaffed_hours_deny',
    label: 'スタッフ常駐時間以外は入館不可',
    description: 'スタッフがいない時間帯は入館を制限',
  },
];

export const GATE_STOP_PATTERN_LABELS: Record<GateStopPattern, string> = {
  always_open: '常時入退館（ストップなし）',
  staffed_hours_deny: 'スタッフ常駐時間のみ入館不可',
  always_deny: '常時入館不可',
  unstaffed_hours_deny: 'スタッフ常駐時間以外は入館不可',
};

/**
 * Whether the member's entry is actually restricted.
 *
 * Single source of truth for every gate-stop indicator on the member detail screen — the
 * status badge, the warning banner and the 入退館設定 card must all derive from this, so they
 * can never contradict each other. 常時入退館（ストップなし）is the normal state and is not a
 * restriction.
 *
 * Read exclusively from the gate-stop record: gate stop is orthogonal to
 * `memberStatus` (a 休会中 member can be gate-stopped too), so the member's status
 * says nothing about it — backend design answer 2026-08-10, QA01 §1-2.
 */
export function isGateStopRestricted(member: {
  gateStop?: { pattern?: string | null } | null;
}): boolean {
  const pattern = member.gateStop?.pattern;
  return !!pattern && pattern !== 'always_open';
}
