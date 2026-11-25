import type {
  AdminBillingRunControllerAddItemData,
  ContractPickerOptionContractItemDto,
  MemberContractItemDto,
  MemberContractListResponseDto,
} from '@/lib/api-real/types.gen';

import type { AddLineItemFormSubmitValues } from '../../_schemas/add-line-item-form.schema';

/**
 * 明細追加「契約から選択」 options — the member's main contracts and their option contracts at the
 * billing's store (`GET members/{memberId}/contracts?includeInactive&storeId`, FR-011 #357). The
 * form keeps one `contract_id` string, so the value carries the API `source` as a prefix.
 */
export interface LineItemContractOption {
  value: string;
  label: string;
  /** 税込 monthly master price since !880 (the API resolves the real amount server-side) */
  amount: number;
}

const CONTRACT_PREFIX = 'contract:';

/** Same suffixes as 手動請求追加 — inactive contracts stay billable (#357), so say which they are */
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
const OPTION_PREFIX = 'option:';

export function buildLineItemContractOptions(
  data: MemberContractListResponseDto | undefined,
): LineItemContractOption[] {
  const options: LineItemContractOption[] = [];
  for (const contract of data?.contracts ?? []) {
    options.push({
      value: `${CONTRACT_PREFIX}${contract.contractId}`,
      label: `${contract.isCurrentMain ? '主契約' : '契約'}：${contract.plan.name}${CONTRACT_STATUS_SUFFIX[contract.contractStatus]}`,
      amount: contract.plan.priceMonthly,
    });
    for (const optionContract of contract.optionContracts) {
      options.push({
        value: `${OPTION_PREFIX}${optionContract.optionContractId}`,
        label: `オプション：${optionContract.option.name}${OPTION_STATUS_SUFFIX[optionContract.status]}`,
        amount: optionContract.option.feeMonthly,
      });
    }
  }
  return options;
}

/** Form values → the `source`-discriminated `POST billings/{billingId}/items` body (API-115 §9.1) */
export function toAddItemBody(
  values: AddLineItemFormSubmitValues,
): AdminBillingRunControllerAddItemData['body'] {
  if (values.source === 'contract') {
    if (values.contract_id.startsWith(OPTION_PREFIX)) {
      return {
        source: 'option_contract',
        optionContractId: values.contract_id.slice(OPTION_PREFIX.length),
      };
    }
    return {
      source: 'contract',
      contractId: values.contract_id.slice(CONTRACT_PREFIX.length),
    };
  }
  return {
    source: 'custom',
    description: values.label.trim(),
    unitPrice: Number(values.amount),
    taxRate: values.tax_rate === '8' ? 8 : 10,
    changeReason: values.reason.trim(),
  };
}
