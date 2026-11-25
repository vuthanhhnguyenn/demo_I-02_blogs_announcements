'use client';

import { StoreMultiSelectInput, StoreSelectInput } from '@/components/common/data-select-input';
import { FormField } from '@/components/common/form-field';

import { allowsMultipleStores } from '../_utils/store-affiliation.util';

interface StaffStoreFieldProps {
  /** The ロール currently on the form — decides single vs multi select. */
  role: string | null | undefined;
  /** Selected store ids, in selection order. */
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  disabled?: boolean;
  /** Names of the stores already on the record (edit), keyed by id. */
  selectedLabels?: Readonly<Record<string, string>>;
}

/**
 * 所属店舗 (パターンA) for the create and edit forms. A Manager picks any number of stores
 * — each becomes a store it manages (管轄店舗 = 所属店舗, Phase 1 interim) — every other
 * role picks one. See spec.md "Manager multi-store affiliation".
 */
export function StaffStoreField({
  role,
  value,
  onChange,
  error,
  disabled = false,
  selectedLabels,
}: StaffStoreFieldProps) {
  const isMulti = allowsMultipleStores(role);

  if (isMulti) {
    return (
      <FormField
        label="所属店舗"
        optional
        description="マネージャーは複数店舗を選択できます。選択した店舗はすべて管轄店舗になります"
        error={error}
      >
        <StoreMultiSelectInput
          value={value}
          onChange={onChange}
          selectedLabels={selectedLabels}
          disabled={disabled}
          hasError={!!error}
          triggerClassName="h-9 max-w-80 rounded-lg"
        />
      </FormField>
    );
  }

  // A non-manager still holding several stores (a role just changed away from Manager is
  // reset by the role handler, so this is only a record that already had several) shows
  // the first one in the trigger while the error asks for a single store.
  const singleId = value[0] ?? null;

  return (
    <FormField label="所属店舗" optional description="1店舗を選択してください" error={error}>
      <StoreSelectInput
        value={singleId}
        onChange={(store) => onChange(store ? [store.id] : [])}
        placeholder="店舗を選択してください"
        clearLabel={null}
        disabled={disabled}
        hasError={!!error}
        valueLabel={singleId ? selectedLabels?.[singleId] : undefined}
        triggerClassName="h-9 max-w-80 rounded-lg"
      />
    </FormField>
  );
}
