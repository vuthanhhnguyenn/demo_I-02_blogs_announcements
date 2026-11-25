import type { PlanDetailDto } from '@/lib/api-real/types.gen';

/** The two API-087 counts that gate 編集 / 削除 (G-01 FR-M004 / FR-M006). */
type ContractActionStateTarget = Pick<PlanDetailDto, 'contractCount' | 'derivedChildCount'>;

export function getContractEditState(contract: Pick<ContractActionStateTarget, 'contractCount'>): {
  canEdit: boolean;
  editBlockedMessage?: string;
} {
  if (contract.contractCount <= 0) {
    return { canEdit: true };
  }

  return {
    canEdit: false,
    editBlockedMessage: '契約者が存在するため編集できません。新規マスタを登録してください',
  };
}

export function getContractDeleteState(contract: ContractActionStateTarget): {
  canDelete: boolean;
  deleteBlockedMessage?: string;
} {
  const { contractCount, derivedChildCount } = contract;

  if (contractCount <= 0 && derivedChildCount <= 0) {
    return { canDelete: true };
  }

  return {
    canDelete: false,
    deleteBlockedMessage: `契約者 ${contractCount.toLocaleString()}名・子主契約 ${derivedChildCount}件が存在するため削除できません`,
  };
}

export const COPY_BLOCKED_MESSAGE = 'このプランは複製できません';

/**
 * 複製 starts from any master the API marks `isCopyable` (false for 特殊契約) — a derived child
 * included, since G-01 FR-M005 copies it as a sibling that inherits the same 親主契約 (`asDerived:
 * false`). One rule for the list menu, the detail header and the create route, so a blocked
 * button cannot be bypassed through `?copyFrom=`.
 */
export function getContractCopyState(contract: { isCopyable: boolean }): {
  canCopy: boolean;
  copyBlockedMessage?: string;
} {
  if (contract.isCopyable) return { canCopy: true };
  return { canCopy: false, copyBlockedMessage: COPY_BLOCKED_MESSAGE };
}

/**
 * 子主契約を作成 (G-01 FR-M007) additionally refuses a master that is itself a derived child — the
 * tree is two levels deep (prototype 2026-09-17, dev answer 2026/08/24).
 */
export function getContractChildCreateState(contract: {
  isCopyable: boolean;
  parentPlanId?: string | null;
}): { canCreateChild: boolean; childCreateBlockedMessage?: string } {
  if (contract.isCopyable && !contract.parentPlanId) return { canCreateChild: true };
  return { canCreateChild: false, childCreateBlockedMessage: COPY_BLOCKED_MESSAGE };
}
