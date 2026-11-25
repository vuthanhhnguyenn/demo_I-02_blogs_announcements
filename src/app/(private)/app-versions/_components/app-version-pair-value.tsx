import { TextWithTooltip } from '@/components/common/text-with-tooltip';

import type { AppVersionDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  type AppVersionSlot,
  enteredAppVersionPair,
  formatAppVersionPair,
} from '../_constants/app-version.constants';

interface AppVersionPairValueProps {
  record: AppVersionDto;
  slot: AppVersionSlot;
  className?: string;
  /**
   * Keep to one line, cut with an ellipsis and a full-value tooltip (table cells). A version name
   * has no length limit, so an unbroken one would otherwise widen its column.
   */
  truncate?: boolean;
}

/**
 * The value in effect at this setting (FR-M002 空欄の引き継ぎ). A value carried over from an
 * earlier setting is muted so it reads apart from one entered on this setting.
 */
export function AppVersionPairValue({
  record,
  slot,
  className,
  truncate = false,
}: AppVersionPairValueProps) {
  const effective = record.effective[slot];
  if (!effective) {
    return <span className={cn('text-muted-foreground/50', className)}>—</span>;
  }

  const isCarriedOver = enteredAppVersionPair(record, slot) === null;
  const valueClassName = cn('font-mono', isCarriedOver && 'text-muted-foreground', className);
  const carriedOverHint = isCarriedOver ? '直前の設定から引き継ぎ' : undefined;

  if (truncate) {
    return (
      <div title={carriedOverHint} className="min-w-0">
        <TextWithTooltip
          text={formatAppVersionPair(effective)}
          className={cn('max-w-40', valueClassName)}
        />
      </div>
    );
  }

  return (
    <span className={valueClassName} title={carriedOverHint}>
      {formatAppVersionPair(effective)}
    </span>
  );
}
