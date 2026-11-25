import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { Bot, Check, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { TransferDetailDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  APPROVAL_STEP_STORE_TYPE_LABELS,
  TRANSFER_BRAND_GROUP_CLASSES,
  TRANSFER_FLOW_BADGE_LABELS,
  TRANSFER_FLOW_NOTES,
  TRANSFER_STEP_STORE_TYPES,
  type TransferBrandGroup,
  getTransferStepLabel,
  toTransferBrandGroup,
} from '../../_constants/constants';

type ApprovalStep = TransferDetailDto['timeline']['steps'][number];

const isCompleted = (step: ApprovalStep) => step.state === 'completed';
// Only the JOYFIT execution step is run by the system; FIT365's is the destination store's approval.
const isAutomatic = (step: ApprovalStep, brandGroup: TransferBrandGroup) =>
  step.step === 'execution' && brandGroup === 'JOYFIT';

/**
 * The sub-line under each step label. The API models the step, not its prose, so the wording is
 * derived here: a finished step reports when and by whom, a pending automatic step reports when
 * the system will run it, and anything else is simply waiting.
 */
function getStepDescription(
  step: ApprovalStep,
  brandGroup: TransferBrandGroup,
  scheduledDate: string | null,
  rejected: boolean,
): string {
  if (isCompleted(step) && step.occurredAt) {
    const parts = [formatDateYYYYMMDD_HHMM(step.occurredAt)];
    if (step.actor?.displayName) parts.push(step.actor.displayName);
    return parts.join(' ');
  }
  // A rejected application closes the flow: the API gives no `rejected` step state, so the
  // remaining steps would otherwise read as still awaiting approval.
  if (rejected) return '未実施';
  if (isAutomatic(step, brandGroup)) {
    return scheduledDate ? `自動実行予定: ${formatDateYYYYMMDD(scheduledDate)}` : '自動実行予定';
  }
  return step.step === 'execution' ? '待機中' : '承認待ち';
}

function getCircleClass(step: ApprovalStep, automatic: boolean): string {
  if (isCompleted(step)) return 'border border-success/30 bg-success/15';
  if (automatic) return 'border border-info/20 bg-info/15';
  return 'border border-border bg-muted';
}

/**
 * Rendered as its own component so the icon type is resolved at module scope rather than during
 * StepItem's render — a component value created per render would remount and lose state.
 */
function StepIcon({ step, automatic }: Readonly<{ step: ApprovalStep; automatic: boolean }>) {
  if (isCompleted(step)) return <Check className="text-success size-3" />;
  if (automatic) return <Bot className="text-info size-3" />;
  return <Clock className="text-muted-foreground size-3" />;
}

function StepItem({
  step,
  isLast,
  brandGroup,
  scheduledDate,
  rejected,
}: Readonly<{
  step: ApprovalStep;
  isLast: boolean;
  brandGroup: TransferBrandGroup;
  scheduledDate: string | null;
  rejected: boolean;
}>) {
  const completed = isCompleted(step);
  const automatic = isAutomatic(step, brandGroup);
  const storeType = TRANSFER_STEP_STORE_TYPES[step.step];
  return (
    <div className="flex gap-3">
      {/* Timeline indicator */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full',
            getCircleClass(step, automatic),
          )}
        >
          <StepIcon step={step} automatic={automatic} />
        </div>
        {!isLast && (
          <div
            className={cn('my-1 min-h-6 w-px flex-1', completed ? 'bg-success/30' : 'bg-border')}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('text-sm font-medium', !completed && 'text-muted-foreground')}>
            {getTransferStepLabel(step.step, brandGroup)}
          </p>

          {storeType && (
            <Badge variant="outline" className="text-muted-foreground px-2 py-0 text-[10px]">
              {APPROVAL_STEP_STORE_TYPE_LABELS[storeType]}
            </Badge>
          )}
          {automatic && (
            <Badge
              variant="outline"
              className="border-info/20 bg-info/15 text-info px-2 py-0 text-[10px]"
            >
              自動実行
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {getStepDescription(step, brandGroup, scheduledDate, rejected)}
        </p>
      </div>
    </div>
  );
}

/**
 * 承認フロー timeline. Step count and shape come from the server's brand-aware
 * `timeline.steps` — 3 steps for JOYFIT, 4 for FIT365 — so this component never has to know
 * the flow rules, only how to draw them.
 */
export function TransferApprovalFlow({ transfer }: Readonly<{ transfer: TransferDetailDto }>) {
  // `timeline.brandGroup` is null only when the member row could not be loaded; the source
  // store's brand carries the same fact then.
  const brandGroup =
    transfer.timeline.brandGroup ?? toTransferBrandGroup(transfer.fromStore.brandEnum);
  if (!brandGroup) return null;
  const steps = transfer.timeline.steps;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">承認フロー</CardTitle>
          <Badge
            variant="outline"
            className={cn('text-xs font-medium', TRANSFER_BRAND_GROUP_CLASSES[brandGroup])}
          >
            {TRANSFER_FLOW_BADGE_LABELS[brandGroup]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <p className="bg-muted/50 text-muted-foreground mb-4 rounded-md p-2 text-xs">
          {TRANSFER_FLOW_NOTES[brandGroup]}
        </p>

        <div className="flex flex-col gap-0">
          {steps.map((step, idx) => (
            <StepItem
              key={step.step}
              step={step}
              isLast={idx === steps.length - 1}
              brandGroup={brandGroup}
              scheduledDate={transfer.scheduledTransferDate}
              rejected={transfer.status === 'rejected'}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
