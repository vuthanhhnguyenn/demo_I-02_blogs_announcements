'use client';

import type { LockerContractDetailDto } from '@/lib/api-real/types.gen';

import { LockerContractContractInfoSection } from './locker-contract-contract-info-section';
import { LockerContractMemberSection } from './locker-contract-member-section';
import { LockerContractPasswordSection } from './locker-contract-password-section';
import { LockerContractUnpaidAlert } from './locker-contract-unpaid-alert';

type LockerContractFormProps = {
  contract: LockerContractDetailDto;
};

/**
 * Locker contract edit form. New contracts are assigned from the cabinet's スロット管理 tab
 * (E-01 FR-005); here the holder and contract info are read-only and only the PIN changes.
 * No slot move and no start / end date edit: API-101 §14 TBD-E01-SLOT-MOVE was closed as not
 * adopted (Otaki, 2026-10-20). The dates stay on the contract detail.
 */
export function LockerContractForm({ contract }: LockerContractFormProps) {
  return (
    <div className="space-y-6">
      {/* FR-005 error case: unpaid balance check */}
      <LockerContractUnpaidAlert memberId={contract.memberId} />

      <LockerContractMemberSection contract={contract} />
      <LockerContractContractInfoSection contract={contract} />
      <LockerContractPasswordSection contract={contract} />
    </div>
  );
}
