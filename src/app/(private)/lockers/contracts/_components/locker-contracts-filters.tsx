'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  LOCKER_CONTRACT_SLOT_STATUS_OPTIONS,
  LOCKER_OPTION_STATUS_LABELS,
  LOCKER_OPTION_STATUS_OPTIONS,
  LOCKER_SLOT_STATUS_LABELS,
  type LockerContractSlotStatus,
  type LockerOptionStatus,
} from '../../_constants/locker-enum-labels.constants';
import { useLockerContractTypeChoices } from '../../_hooks/use-locker-contract-type-choices.hook';

function filterActiveClass(isActive: boolean) {
  return isActive ? 'border-primary bg-primary/10 text-foreground' : '';
}

type LockerContractsFiltersProps = {
  storeId: string | undefined;
  filters: {
    locker_contracts_status: LockerOptionStatus | null;
    locker_contracts_slot_status: LockerContractSlotStatus | null;
    locker_contracts_option_id: string | null;
  };
  setFilters: (value: {
    locker_contracts_page?: number;
    locker_contracts_status?: LockerOptionStatus | null;
    locker_contracts_slot_status?: LockerContractSlotStatus | null;
    locker_contracts_option_id?: string | null;
  }) => void;
};

/**
 * Filters for the contract list tab: contract status (`optionStatus`), スロット状態 (`slotStatus`)
 * and 契約種類 (`optionId`) — API-101 §4.2. Three selects fit on one row, so there is no
 * collapsible section.
 */
export function LockerContractsFilters({
  storeId,
  filters,
  setFilters,
}: LockerContractsFiltersProps) {
  const { choices: options, byId } = useLockerContractTypeChoices(storeId);
  const selectedOption = filters.locker_contracts_option_id
    ? byId.get(filters.locker_contracts_option_id)
    : undefined;

  return (
    <div className="flex items-center gap-2">
      {/* TODO(round3) R304: free-text search (契約ID・会員名) — not in the spec and
          `GET /admin/locker-contracts` has no `q`. Integrate in phase 2.
      <div className="relative max-w-100 flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="契約ID・会員名で検索"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-8 pl-9 text-xs"
        />
      </div>
      */}

      <div className="ml-auto flex items-center gap-2">
        <Select
          value={filters.locker_contracts_status ?? 'all'}
          onValueChange={(value) => {
            setFilters({
              locker_contracts_status: value === 'all' ? null : (value as LockerOptionStatus),
              locker_contracts_page: 1,
            });
          }}
        >
          <SelectTrigger
            size="sm"
            className={`h-8 w-40 text-xs ${filterActiveClass(filters.locker_contracts_status !== null)}`}
          >
            <SelectValue>
              {filters.locker_contracts_status
                ? LOCKER_OPTION_STATUS_LABELS[filters.locker_contracts_status]
                : '全てのステータス'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全てのステータス</SelectItem>
            {LOCKER_OPTION_STATUS_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.locker_contracts_slot_status ?? 'all'}
          onValueChange={(value) => {
            setFilters({
              locker_contracts_slot_status:
                value === 'all' ? null : (value as LockerContractSlotStatus),
              locker_contracts_page: 1,
            });
          }}
        >
          <SelectTrigger
            size="sm"
            className={`h-8 w-40 text-xs ${filterActiveClass(filters.locker_contracts_slot_status !== null)}`}
          >
            <SelectValue>
              {filters.locker_contracts_slot_status
                ? LOCKER_SLOT_STATUS_LABELS[filters.locker_contracts_slot_status]
                : '全てのスロット状態'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全てのスロット状態</SelectItem>
            {LOCKER_CONTRACT_SLOT_STATUS_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.locker_contracts_option_id ?? 'all'}
          onValueChange={(value) => {
            setFilters({
              locker_contracts_option_id: value === 'all' ? null : value,
              locker_contracts_page: 1,
            });
          }}
        >
          <SelectTrigger
            size="sm"
            className={`h-8 w-48 text-xs ${filterActiveClass(filters.locker_contracts_option_id !== null)}`}
          >
            <SelectValue>{selectedOption?.name ?? '全ての契約種類'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全ての契約種類</SelectItem>
            {options.map((option) => (
              // Several stores can share an option name under 全店舗 — the code tells them apart
              <SelectItem key={option.id} value={option.id} className="max-w-80">
                <span className="truncate">{option.name}</span>
                <span className="text-muted-foreground ml-1 shrink-0 font-mono text-[10px]">
                  {option.optionCode}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
