import { formatDateYYYYMM, formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { Check, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { SuspWdrDetailDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  LEAVE_TYPE_CLASSES,
  LEAVE_TYPE_LABELS,
  LeaveType,
  PROXY_AGREEMENT_METHOD_LABELS,
  TIMELINE_STEP_LABELS,
  applicantLabel,
} from '../../_constants/constants';

type LeaveDetail = SuspWdrDetailDto;
type TimelineStep = LeaveDetail['timeline']['steps'][number];

/** Mirrors the server guard: usage has started once the start date has arrived. */
export function isUsageStarted(usageStartDate: string): boolean {
  return new Date(usageStartDate) <= new Date();
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function LeaveDetailInfo({ leave }: Readonly<{ leave: LeaveDetail }>) {
  const isSuspension = leave.applicationType === LeaveType.SUSPENSION;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">申請情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {/* FR-058 — the human-readable application number, never the record id. */}
          <Field label="申請ID">
            <span className="font-mono">{leave.applicationNumber ?? '—'}</span>
          </Field>

          <Field label="種別">
            <Badge
              variant="outline"
              className={cn('text-[10px]', LEAVE_TYPE_CLASSES[leave.applicationType])}
            >
              {LEAVE_TYPE_LABELS[leave.applicationType]}
            </Badge>
          </Field>

          {/* The effective-date key differs by type: a suspension carries start/end dates. */}
          <Field label={isSuspension ? '休会開始月' : '退会予定日'}>
            {isSuspension
              ? formatDateYYYYMM(leave.startDate)
              : formatDateYYYYMMDD(leave.scheduledDate)}
          </Field>

          <Field label={isSuspension ? '休会終了月' : '終了日'}>
            {isSuspension ? formatDateYYYYMM(leave.endDate) : '—'}
          </Field>

          {/* A-03 FR-002 — the usage start date is what decides whether a withdrawal can still be cancelled. */}
          {!isSuspension && (
            <div className="col-span-2">
              <Field label="利用開始日">
                {leave.usageStartDate ? (
                  <>
                    {formatDateYYYYMMDD(leave.usageStartDate)}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {isUsageStarted(leave.usageStartDate)
                        ? '（利用開始後のため退会取り消し不可）'
                        : '（利用開始前のため退会取り消し可）'}
                    </span>
                  </>
                ) : (
                  '—'
                )}
              </Field>
            </div>
          )}

          <div className="col-span-2">
            <Field label="理由">{leave.reason ?? '—'}</Field>
          </div>

          <Field label="申請者">{applicantLabel(leave)}</Field>

          <Field label="申請日時">{formatDateYYYYMMDD_HHMM(leave.appliedAt)}</Field>
        </div>
      </CardContent>
    </Card>
  );
}

/** Japanese label per timeline step; 承認 reads by application type. */
function stepLabel(step: TimelineStep['step'], isSuspension: boolean): string {
  if (step === 'approval') return isSuspension ? '休会承認' : '退会承認';
  return TIMELINE_STEP_LABELS[step];
}

function StepRow({
  title,
  step,
  isLast,
}: Readonly<{ title: string; step: TimelineStep; isLast: boolean }>) {
  const done = step.state === 'completed';
  const current = step.state === 'current';
  const caption = done
    ? [formatDateYYYYMMDD_HHMM(step.occurredAt), step.actor?.displayName].filter(Boolean).join(' ')
    : current
      ? '現在のステップ'
      : '待機中';

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full border',
            done && 'border-success/30 bg-success/15',
            current && 'border-primary bg-primary/15',
            !done && !current && 'border-border bg-muted',
          )}
        >
          {done ? (
            <Check className="text-success size-3" />
          ) : (
            <Clock className={cn('size-3', current ? 'text-primary' : 'text-muted-foreground')} />
          )}
        </div>
        {!isLast && (
          <div
            className={cn('my-1 w-px flex-1', done ? 'bg-success/30' : 'bg-border')}
            style={{ minHeight: '24px' }}
          />
        )}
      </div>
      <div className="flex-1 pb-4">
        <p
          className={cn(
            'text-sm font-medium',
            current && 'text-primary',
            !done && !current && 'text-muted-foreground',
          )}
        >
          {title}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">{caption}</p>
      </div>
    </div>
  );
}

export function LeaveApprovalFlow({ leave }: Readonly<{ leave: LeaveDetail }>) {
  /**
   * FR-002 — the flow is the server timeline as returned: its steps, their order and state.
   * The prototype only fixes the presentation; a suspension carries 休会開始 / 休会終了 on top
   * of 申請 → 承認, and the `current` step is highlighted.
   */
  const isSuspension = leave.applicationType === LeaveType.SUSPENSION;
  const { steps } = leave.timeline;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">承認フロー</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-0">
          {steps.map((step, i) => (
            <StepRow
              key={step.step}
              title={stepLabel(step.step, isSuspension)}
              step={step}
              isLast={i === steps.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function LeaveProxyInfo({ leave }: Readonly<{ leave: LeaveDetail }>) {
  if (leave.applicationSource !== 'proxy') return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">代理申請情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <Field label="代理申請者">{leave.proxyStaff?.displayName ?? '—'}</Field>
          {/* `formatDateYYYYMMDD_HHMM` already falls back to '—' on a null/unparsable value. */}
          <Field label="合意日時">{formatDateYYYYMMDD_HHMM(leave.proxyAgreedAt)}</Field>
          <Field label="合意方法">
            {leave.proxyAgreementMethod
              ? PROXY_AGREEMENT_METHOD_LABELS[leave.proxyAgreementMethod]
              : '—'}
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeaveRelatedInfo({ leave }: Readonly<{ leave: LeaveDetail }>) {
  const isSuspension = leave.applicationType === LeaveType.SUSPENSION;
  const { relatedInfo } = leave;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">関連情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {/*
            FR-067 — `fee` is the filing-time snapshot: 休会費 on a suspension, 解約手数料 on a
            withdrawal. Its unit and the 退会 heading are still open (qa-156 ⑤ / qa-157 ②).
          */}
          <Field label={isSuspension ? '休会費' : '退会手数料'}>
            {leave.fee != null ? `¥${leave.fee.toLocaleString()}${isSuspension ? '/月' : ''}` : '—'}
          </Field>

          <Field label="適用キャンペーン">{relatedInfo.campaign?.name ?? '—'}</Field>

          <Field label="未消化レッスン">
            {relatedInfo.unusedLessonCount != null ? `${relatedInfo.unusedLessonCount}回` : '—'}
          </Field>

          <Field label="未納金">
            <span className={cn(relatedInfo.delinquentAmount > 0 && 'text-destructive')}>
              ¥{relatedInfo.delinquentAmount.toLocaleString()}
            </span>
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
