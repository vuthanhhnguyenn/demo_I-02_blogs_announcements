'use client';

import { STAFF_ROLE_LABELS, StaffRole } from '@/constants/staff.constants';
import { toSelectItems } from '@/utils/app.util';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Sentinel for the "all" row — nuqs and the Select both treat '' as absent.
const ALL_ROLES_VALUE = '__all_roles__';

// `system` is an internal role and never offered for selection.
const SELECTABLE_ROLES = (Object.values(StaffRole) as StaffRole[]).filter(
  (role) => role !== StaffRole.SYSTEM,
);

interface RoleSelectInputProps {
  /** Selected role; `null` means nothing selected (i.e. the "all" state). */
  value: StaffRole | null;
  /** Fired with the picked role, or `null` when the "all" row is chosen. */
  onChange: (role: StaffRole | null) => void;
  /**
   * Roles to offer. Defaults to every role except `system`; narrow it when a
   * screen may only assign a subset.
   */
  roles?: readonly StaffRole[];
  /**
   * Label of the leading "all" row. Pass `null` to drop it — the field then has
   * no way back to an empty selection (required-field usage).
   */
  allLabel?: string | null;
  /** Trigger text while nothing is selected. */
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  triggerClassName?: string;
}

/**
 * Shared staff role (ロール) picker.
 *
 * The role set is a fixed, short enum, so this is a plain `Select` — no search
 * box or infinite scroll, unlike the store picker in `./store-select-input`.
 */
export function RoleSelectInput({
  value,
  onChange,
  roles = SELECTABLE_ROLES,
  allLabel = '全ロール',
  placeholder = '全ロール',
  disabled = false,
  hasError = false,
  triggerClassName = 'h-9 w-[160px] rounded-lg',
}: RoleSelectInputProps) {
  const hasAllRow = allLabel !== null;

  const handleValueChange = (nextValue: string | null) => {
    const resolved = nextValue ?? ALL_ROLES_VALUE;
    onChange(resolved === ALL_ROLES_VALUE ? null : (resolved as StaffRole));
  };

  return (
    <Select
      value={value ?? (hasAllRow ? ALL_ROLES_VALUE : null)}
      onValueChange={handleValueChange}
      disabled={disabled}
      items={toSelectItems([
        ...(hasAllRow ? [{ value: ALL_ROLES_VALUE, label: allLabel }] : []),
        ...roles.map((role) => ({ value: role, label: STAFF_ROLE_LABELS[role] })),
      ])}
    >
      <SelectTrigger
        className={triggerClassName}
        // aria-invalid lets useScrollToFirstError locate the field while it has an error
        aria-invalid={hasError || undefined}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="end">
        {hasAllRow ? <SelectItem value={ALL_ROLES_VALUE}>{allLabel}</SelectItem> : null}
        {roles.map((role) => (
          <SelectItem key={role} value={role}>
            {STAFF_ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
