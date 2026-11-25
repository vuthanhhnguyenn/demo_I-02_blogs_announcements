import type { LockerContractDetailDto, UpdateLockerSlotDto } from '@/lib/api-real/types.gen';

import type {
  LockerContractFormSubmitValues,
  LockerContractFormValues,
} from '../_schemas/locker-contract-form.schema';

export const emptyLockerContractFormDefaults: LockerContractFormValues = { pinCode: '' };

/** `LockerContractSlotBlockDto.lockMethod` is typed `string`; E-LOC-007: a PIN is dial-lock only */
export function isDialLockContract(contract: LockerContractDetailDto): boolean {
  return contract.slot.lockMethod === 'dial_lock';
}

export function lockerContractDetailToFormValues(
  contract: LockerContractDetailDto,
): LockerContractFormValues {
  return { pinCode: contract.slot.pinCode ?? '' };
}

export function validateDialPin(contract: LockerContractDetailDto, pinCode: string): string | null {
  if (!isDialLockContract(contract)) return null;
  if (/^\d{4}$/.test(pinCode)) return null;
  return 'ダイヤル錠の場合は4桁の暗証番号が必須です';
}

export function lockerContractFormValuesToSlotPatch(
  values: LockerContractFormSubmitValues,
): UpdateLockerSlotDto {
  return { pinCode: values.pinCode };
}
