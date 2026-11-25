import { toTaxExcludedPrice } from '@/utils/tax.util';

import type {
  ContractPickerOptionContractItemDto,
  MemberContractItemDto,
} from '@/lib/api-real/types.gen';

/** A line-item source a manual billing / added line can reference (API-115 §8.1.1) */
export interface ContractOption {
  /** Unique across both kinds — `contract:<id>` / `option_contract:<id>` */
  key: string;
  source: 'contract' | 'option_contract';
  /** `contracts.id` or `option_contracts.id` — the body's `contractId` / `optionContractId` */
  id: string;
  label: string;
  /** Tax-excluded unit price the server will resolve (display only — FR-011 「編集不可」) */
  amount: number;
  /** Master price — 税込 since !880, billed as is */
  amountWithTax: number;
  /** Fraction (0.1 / 0.08) */
  taxRate: number;
}

const CONTRACT_STATUS_SUFFIX: Record<MemberContractItemDto['contractStatus'], string> = {
  active: '',
  suspended: '（休会中）',
  cancelled: '（解約済）',
};

const OPTION_STATUS_SUFFIX: Record<ContractPickerOptionContractItemDto['status'], string> = {
  pending_start: '（開始前）',
  active: '',
  pending_cancel: '（解約予定）',
  cancelled: '（解約済）',
  used: '（利用済）',
  expired: '（期限切れ）',
};

/**
 * Picker options from the store-scoped `GET /admin/members/{id}/contracts?includeInactive=true&storeId=`
 * alone (#357 — inactive contracts can still be billed): each contract with its `optionContracts[]`,
 * the same source as the detail 明細追加 dialog. The paged option-contracts list (100 per page)
 * dropped options past the first page and needed a client-side store filter (k.iwaki !190 / !192).
 * Used per-use tickets are dropped: nothing is left to bill.
 */
export function buildContractOptions(
  contracts: readonly MemberContractItemDto[] | undefined,
): ContractOption[] {
  const options: ContractOption[] = [];

  for (const contract of contracts ?? []) {
    const prefix = contract.isCurrentMain ? '主契約' : '契約';
    options.push({
      key: `contract:${contract.contractId}`,
      source: 'contract',
      id: contract.contractId,
      label: `${prefix}：${contract.plan.name}${CONTRACT_STATUS_SUFFIX[contract.contractStatus]}`,
      ...fromTaxIncludedPrice(contract.plan.priceMonthly, contract.plan.taxRate),
      taxRate: contract.plan.taxRate / 100,
    });

    for (const optionContract of contract.optionContracts) {
      if (optionContract.status === 'used') continue;
      options.push({
        key: `option_contract:${optionContract.optionContractId}`,
        source: 'option_contract',
        id: optionContract.optionContractId,
        label: `オプション：${optionContract.option.name}${OPTION_STATUS_SUFFIX[optionContract.status]}`,
        // BE bills the option master price (API-115 unit_price = options.fee_monthly, 税込 — !880),
        // not the contract's monthlyFee — same source as the detail dialog
        ...fromTaxIncludedPrice(optionContract.option.feeMonthly, optionContract.option.taxRate),
        taxRate: optionContract.option.taxRate / 100,
      });
    }
  }

  return options;
}

/**
 * Price masters are 税込 since !880 (API-094 v0.13 §14B); the 税抜 unit price is
 * `ceil(税込 × 100 / (100 + taxRate))` — never add tax to the master price again.
 */
export function fromTaxIncludedPrice(
  amountWithTax: number,
  taxRatePercent: number,
): Pick<ContractOption, 'amount' | 'amountWithTax'> {
  return {
    amount: toTaxExcludedPrice(amountWithTax, taxRatePercent),
    amountWithTax,
  };
}

/**
 * Client-side 税込見積 for a line: `floor(unitPrice × (1 + taxRate))` — API-115 BR-BIL-108. The
 * server recomputes the real figure on create; this is display only.
 */
export function toTaxIncludedAmount(amount: number, taxRate: number): number {
  return Math.floor((amount * Math.round(100 + taxRate * 100)) / 100);
}
