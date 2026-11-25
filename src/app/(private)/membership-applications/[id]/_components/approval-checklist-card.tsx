'use client';

import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { AlertTriangle, CheckCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  BRAND_MIN_AGE,
  DEFAULT_BRAND_MIN_AGE,
  USAGE_START_WARNING_MONTHS,
} from '../../_constants/constants';
import { isBlacklistFlagged } from '../../_utils/application-dto.util';
import type { ApplicationDetail } from './membership-application.utils';

interface ApprovalChecklistCardProps {
  app: ApplicationDetail;
}

/**
 * 承認前チェック — rendered by the caller while 未審査 / 審査中.
 *
 * Every verdict is the API's: `member.isMinor` (under 18 at the usage start date),
 * `approvalChecklist.ageEligible` (≥ plan / brand minimum age), BL and usage-start checks. The
 * minimum shown is `plan.minAge`, falling back to the brand minimum when the plan has none.
 */
export function ApprovalChecklistCard({ app }: Readonly<ApprovalChecklistCardProps>) {
  const brand = app.store.brandGroup;
  const minAge = app.plan.minAge ?? BRAND_MIN_AGE[brand] ?? DEFAULT_BRAND_MIN_AGE;
  const age = app.member.ageAtApplication;
  const { isMinor } = app.member;
  const ageEligible = app.approvalChecklist.ageEligible;
  const usageStartOk = app.approvalChecklist.usageStartDateWithinTwoMonths;
  // `unchecked` must never read as a passed check — the comparison has not run.
  const blacklistPassed = app.approvalChecklist.blacklistCheckCompleted;
  const parentalConsentAt = app.member.parentApprovalAt;
  const brandLabel = brand;

  return (
    <>
      <Separator className="w-full" />
      <div className="flex w-full flex-col gap-2">
        <span className="text-muted-foreground text-xs font-medium">承認前チェック</span>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {blacklistPassed ? (
              <CheckCircle className="text-success size-4 shrink-0" />
            ) : (
              <AlertTriangle className="text-warning size-4 shrink-0" />
            )}
            <span className={blacklistPassed ? 'text-xs' : 'text-warning text-xs'}>
              {blacklistPassed ? 'ブラックリスト照合完了' : 'ブラックリスト照合未完了'}
            </span>
            {isBlacklistFlagged(app.blacklist.matchResult) && (
              <Badge
                variant="outline"
                className="bg-destructive/15 text-destructive border-destructive/20 ml-auto text-[10px]"
              >
                一致あり
              </Badge>
            )}
          </div>

          {!ageEligible ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-destructive size-4 shrink-0" />
              <span className="text-destructive text-xs">
                年齢条件: 対象外（{age}歳 / {brandLabel}: {minAge}歳以上）
              </span>
            </div>
          ) : isMinor ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-warning size-4 shrink-0" />
                <span className="text-warning text-xs">
                  未成年（{age}歳 / {brandLabel}: {minAge}歳以上）
                </span>
                {parentalConsentAt && (
                  <Badge
                    variant="outline"
                    className="bg-success/15 text-success border-success/20 ml-auto text-[10px]"
                  >
                    保護者同意確認済み
                  </Badge>
                )}
              </div>
              {parentalConsentAt && (
                <div className="text-muted-foreground pl-6 text-[10px] wrap-anywhere">
                  {/* C-01 FR-M004: consent is a confirmation checkbox only — no 同意方法 (prototype 8/27). */}
                  同意日時: {formatDateYYYYMMDD_HHMM(parentalConsentAt, '—')}
                  {app.member.parentName && ` ／ 保護者: ${app.member.parentName}`}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle className="text-success size-4 shrink-0" />
              <span className="text-xs">
                年齢条件: 成人（{age}歳 / {brandLabel}: {minAge}歳以上）
              </span>
            </div>
          )}

          {usageStartOk ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="text-success size-4 shrink-0" />
              <span className="text-xs">利用開始日: {USAGE_START_WARNING_MONTHS}ヶ月以内</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-warning size-4 shrink-0" />
              <span className="text-warning text-xs">
                利用開始日: 契約開始日から{USAGE_START_WARNING_MONTHS}ヶ月超（
                {formatDateYYYYMMDD(app.usageStartDate ?? undefined, '—')}）
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
