import { RequiredMark } from '@/components/common/field-marker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { LEAVE_CANCEL_REASON_MAX_LENGTH } from '../_constants/constants';

function clampToMaxLength(text: string): string {
  const chars = Array.from(text);
  return chars.length > LEAVE_CANCEL_REASON_MAX_LENGTH
    ? chars.slice(0, LEAVE_CANCEL_REASON_MAX_LENGTH).join('')
    : text;
}

interface LeaveCancelReasonFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * A-03 FR-002 (v3) — the cancellation is a state change kept in history, so its reason is
 * mandatory. Shared by the list and the detail confirmation dialogs.
 */
export function LeaveCancelReasonField({
  value,
  onChange,
  disabled,
}: Readonly<LeaveCancelReasonFieldProps>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="leave-cancel-reason" className="text-sm">
        取り消し理由
        <RequiredMark />
      </Label>
      <Textarea
        id="leave-cancel-reason"
        placeholder="取り消し理由を入力してください..."
        rows={3}
        value={value}
        disabled={disabled}
        // Capped by characters, not UTF-16 units: `maxLength` would halve the limit for 𠮷 or emoji.
        onChange={(e) => onChange(clampToMaxLength(e.target.value))}
      />
      <p className="text-muted-foreground text-xs">
        操作履歴に記録されます（{LEAVE_CANCEL_REASON_MAX_LENGTH}文字以内）
      </p>
    </div>
  );
}
