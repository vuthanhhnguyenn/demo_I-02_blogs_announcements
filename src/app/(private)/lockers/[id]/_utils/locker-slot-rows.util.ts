import type {
  LockerContractItemDto,
  LockerDetailDto,
  LockerSlotGridItemDto,
} from '@/lib/api-real/types.gen';

import { formatLockerSlotLabel } from '../../_constants/locker-enum-labels.constants';

/**
 * One slot of the cabinet as the スロット管理 tab shows it: the grid cell from
 * `GET /admin/lockers/{lockerId}` joined with its live contract row from
 * `GET /admin/locker-contracts?lockerId=` (by `slotId`).
 */
export type LockerSlotRow = {
  slot: LockerSlotGridItemDto;
  /** 「A-001」 */
  label: string;
  contract: LockerContractItemDto | null;
  /** The cabinet default for this slot — what applies while the slot has no `feeOptionId` */
  defaultOptionId: string | null;
  /** FR-013 two-layer fee: the slot's own `feeOptionId`, else {@link defaultOptionId} */
  effectiveOptionId: string | null;
};

/**
 * The cabinet default for a slot (API-100 v0.16 / API-101 v0.15): the bottom row uses
 * `bottomOptionId` when the cabinet has one (migrated data only — the CRM no longer sets it),
 * otherwise every slot uses the cabinet's 契約形態コード `optionId`.
 */
export function getCabinetDefaultOptionId(
  locker: Pick<LockerDetailDto, 'optionId' | 'bottomOptionId'>,
  slot: Pick<LockerSlotGridItemDto, 'isBottomRow'>,
): string | null {
  return slot.isBottomRow ? (locker.bottomOptionId ?? locker.optionId) : locker.optionId;
}

export function buildLockerSlotRows(
  locker: LockerDetailDto,
  contracts: readonly LockerContractItemDto[],
): LockerSlotRow[] {
  const contractBySlotId = new Map(contracts.map((contract) => [contract.slotId, contract]));
  return locker.slots.map((slot) => {
    const defaultOptionId = getCabinetDefaultOptionId(locker, slot);
    return {
      slot,
      label: formatLockerSlotLabel(locker.location.locationCode, slot.slotCode),
      contract: contractBySlotId.get(slot.id) ?? null,
      defaultOptionId,
      effectiveOptionId: slot.feeOptionId ?? defaultOptionId,
    };
  });
}
