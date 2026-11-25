'use client';

import type { ReactNode } from 'react';

import { useRouter } from 'next/navigation';

import { useCurrentStore } from '@/contexts/current-store.context';
import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Link2, Link2Off } from 'lucide-react';

import { JargonTip } from '@/components/common/jargon-tip';
import { SummaryCard } from '@/components/common/summary-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { adminCampaignControllerReportOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { CampaignDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import {
  CAMPAIGN_APPLY_START_MONTH_LABELS,
  CAMPAIGN_BRAND_LABELS,
  CAMPAIGN_ENABLED_BADGE_CLASS,
  CAMPAIGN_INFO_BADGE_CLASS,
  CAMPAIGN_TARGET_SEX_BADGE_CLASSES,
  CAMPAIGN_TARGET_SEX_LABELS,
} from '../../_constants/constants';
import {
  buildDiscountLines,
  buildDiscountSummary,
  entryFeeDiscountText,
  formatDiscountLine,
} from '../../_utils/campaign-discount';
import { buildLockInExample } from '../../_utils/campaign-lock-in';
import { CampaignAcceptancePanel } from './campaign-acceptance-panel';

const DASH = '—';

function Field({
  label,
  children,
  className,
}: Readonly<{ label: ReactNode; children: ReactNode; className?: string }>) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      {children}
    </div>
  );
}

function TextValue({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="text-sm font-medium [overflow-wrap:anywhere]">{children}</p>;
}

function applyStartMonthText(campaign: CampaignDetailDto): string {
  if (campaign.applyStartMonth === null) return DASH;
  if (campaign.applyStartMonth === 'specific_month') {
    return `${campaign.applyStartSpecificN ?? '?'}ヶ月目から`;
  }
  return CAMPAIGN_APPLY_START_MONTH_LABELS[campaign.applyStartMonth];
}

/** First / last day of the current month in JST, as `YYYY-MM-DD` (the report window is JST-based). */
function currentMonthRangeJst(): { from: string; to: string } {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const [year, month] = today.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, '0');
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

export function BasicInfoTab({ campaign }: Readonly<{ campaign: CampaignDetailDto }>) {
  const router = useRouter();
  const campaignId = campaign.campaignId;
  const discountLines = buildDiscountLines(campaign);
  // `GET ~/report`: all-time per-source breakdown, plus the same call windowed to this month.
  const { data: report, isError: isReportError } = useQuery(
    adminCampaignControllerReportOptions({ path: { campaignId } }),
  );
  const { data: monthlyReport, isError: isMonthlyReportError } = useQuery(
    adminCampaignControllerReportOptions({ path: { campaignId }, query: currentMonthRangeJst() }),
  );
  const channels = report?.sourceBreakdown;
  const { currentStoreId } = useCurrentStore();
  const myStoreUsage = campaign.myStoreUsage;
  // myStoreUsage follows the JWT store, not the header selection — show it only when they match.
  const showStoreUsage = myStoreUsage !== null && myStoreUsage.storeId === currentStoreId;

  const referralEnabled = campaign.referralBasePoints !== null;
  const conditionalSexes =
    campaign.campaignAutoOptions.find((entry) => entry.targetSexes !== null)?.targetSexes ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          title="適用会員数"
          value={campaign.activeContractCount.toLocaleString()}
          suffix="名"
        />
        <SummaryCard
          title="申請数"
          value={campaign.pendingApplicationCount.toLocaleString()}
          suffix="件"
          tone="info"
        />
        <SummaryCard
          title="今月の新規適用"
          value={isMonthlyReportError ? '—' : (monthlyReport?.appliedCount ?? 0).toLocaleString()}
          suffix={isMonthlyReportError ? undefined : '名'}
          tone="success"
        />
      </div>

      <Card className="py-0">
        <div className="flex items-center gap-4 px-4 py-3">
          <p className="text-muted-foreground text-xs font-semibold">入会経路別内訳</p>
          <div className="text-muted-foreground text-xs">
            モバイル:{' '}
            <span className="text-foreground font-semibold">
              {isReportError ? '—' : `${channels?.mobile ?? 0}名`}
            </span>
          </div>
          <span className="text-border">|</span>
          <div className="text-muted-foreground text-xs">
            手動:{' '}
            <span className="text-foreground font-semibold">
              {isReportError ? '—' : `${channels?.manual ?? 0}名`}
            </span>
          </div>
          <span className="text-border">|</span>
          <div className="text-muted-foreground text-xs">
            紹介経由:{' '}
            <span className="text-foreground font-semibold">
              {isReportError ? '—' : `${channels?.referral ?? 0}名`}
            </span>
          </div>
          <p className="text-muted-foreground ml-auto text-xs">
            {isReportError
              ? '集計を取得できませんでした'
              : `適用会員数 ${campaign.activeContractCount}名の内訳`}
          </p>
        </div>
      </Card>

      <div className="flex gap-4">
        {/* Left column (60%) */}
        <div className="flex w-[60%] flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="キャンペーンID">
                  <TextValue>{campaign.campaignNumber}</TextValue>
                </Field>
                <Field label="キャンペーン名" className="min-w-0">
                  <p className="truncate text-sm font-medium" title={campaign.name}>
                    {campaign.name}
                  </p>
                </Field>
                <Field label="キャンペーンコード">
                  {campaign.campaignCode ? (
                    <code className="bg-muted rounded px-2 py-1 font-mono text-sm">
                      {campaign.campaignCode}
                    </code>
                  ) : (
                    <TextValue>{DASH}</TextValue>
                  )}
                </Field>
                <Field label="ブランド">
                  <Badge variant="outline">{CAMPAIGN_BRAND_LABELS[campaign.brandEnum]}</Badge>
                </Field>
                <Field label="公開店舗">
                  {campaign.publishScope === 'all_stores' ? (
                    <Badge variant="outline">全店舗に公開</Badge>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={CAMPAIGN_INFO_BADGE_CLASS}>
                        特定店舗のみ
                      </Badge>
                      {campaign.publishedStores.map((store) => (
                        <Badge
                          key={store.storeId}
                          variant="outline"
                          className="h-auto max-w-full text-left [overflow-wrap:anywhere] whitespace-normal"
                        >
                          {store.storeName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Field>
                <Field label="先着件数上限">
                  <TextValue>
                    {campaign.capacityLimit === null
                      ? DASH
                      : `先着${campaign.capacityLimit}件（残り${campaign.remainingCount ?? 0}件）`}
                  </TextValue>
                </Field>
                <Field label="備考" className="col-span-2">
                  <p className="text-sm">{campaign.remarks ?? DASH}</p>
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* 割引概要は割引設定 (入会金 + 主契約/オプション単位) から自動生成する */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">割引設定</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="割引概要" className="col-span-2">
                  <TextValue>{buildDiscountSummary(campaign)}</TextValue>
                </Field>
                <Field label="入会金割引" className="col-span-2">
                  <TextValue>{entryFeeDiscountText(campaign) ?? 'なし'}</TextValue>
                </Field>
                <Field label="主契約・オプション割引" className="col-span-2">
                  {discountLines.length === 0 ? (
                    <TextValue>なし</TextValue>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {discountLines.map((line) => (
                        <div
                          key={`${line.target}-${line.targetName}`}
                          className="flex min-w-0 items-start gap-2"
                        >
                          <Badge variant="outline" className="shrink-0">
                            {line.target}
                          </Badge>
                          <p className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">
                            {formatDiscountLine(line)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">適用条件</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label={<JargonTip term="主契約">適用主契約</JargonTip>}>
                  <Badge variant="outline" className="max-w-full" title={campaign.planName}>
                    <span className="truncate">{campaign.planName}</span>
                  </Badge>
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">期間設定</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-semibold">募集期間</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <Field label="開始日">
                      <TextValue>{formatDateYYYYMMDD(campaign.recruitmentStart)}</TextValue>
                    </Field>
                    <Field label="終了日">
                      <TextValue>{formatDateYYYYMMDD(campaign.recruitmentEnd)}</TextValue>
                    </Field>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-semibold">利用開始期間</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <Field label="開始日">
                      <TextValue>
                        {campaign.usageStart ? formatDateYYYYMMDD(campaign.usageStart) : DASH}
                      </TextValue>
                    </Field>
                    <Field label="終了日">
                      <TextValue>
                        {campaign.usageEnd ? formatDateYYYYMMDD(campaign.usageEnd) : DASH}
                      </TextValue>
                    </Field>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-semibold">
                    キャンペーン適用期間
                  </p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <Field label="適用開始月">
                      <TextValue>{applyStartMonthText(campaign)}</TextValue>
                    </Field>
                    <Field label="適用期間">
                      <TextValue>
                        {campaign.applyDurationMonths === null
                          ? DASH
                          : `${campaign.applyDurationMonths}ヶ月（利用開始日起算）`}
                      </TextValue>
                    </Field>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-semibold">
                    縛り期間（解約手数料期間）
                  </p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <Field label="期間">
                      <TextValue>
                        {campaign.cancellationFeeMonths === null
                          ? DASH
                          : `${campaign.cancellationFeeMonths}ヶ月`}
                      </TextValue>
                    </Field>
                    <Field label="適用例">
                      <TextValue>
                        {buildLockInExample(
                          campaign.recruitmentStart,
                          campaign.cancellationFeeMonths,
                        ) ?? DASH}
                      </TextValue>
                    </Field>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    JOYFIT自動移籍判定でこの値が参照されます
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">自動付与設定</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="自動付与">
                  <Badge
                    variant="outline"
                    className={cn(
                      campaign.campaignAutoOptions.length > 0 && CAMPAIGN_ENABLED_BADGE_CLASS,
                    )}
                  >
                    {campaign.campaignAutoOptions.length > 0 ? 'あり' : 'なし'}
                  </Badge>
                </Field>
                <Field label="付与対象">
                  <TextValue>{conditionalSexes.length > 0 ? '条件あり' : '全員'}</TextValue>
                </Field>
                <Field label="性別条件">
                  {conditionalSexes.length === 0 ? (
                    <TextValue>{DASH}</TextValue>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {conditionalSexes.map((sex) => (
                        <Badge
                          key={sex}
                          variant="outline"
                          className={CAMPAIGN_TARGET_SEX_BADGE_CLASSES[sex]}
                        >
                          {CAMPAIGN_TARGET_SEX_LABELS[sex]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Field>
                <Field label="付与オプション">
                  {campaign.campaignAutoOptions.length === 0 ? (
                    <TextValue>{DASH}</TextValue>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {campaign.campaignAutoOptions.map((entry) => (
                        <Badge
                          key={entry.optionId}
                          variant="outline"
                          className="max-w-full"
                          title={entry.optionName}
                        >
                          <span className="truncate">{entry.optionName}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">紹介キャンペーン特典</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="友達紹介連動">
                  <Badge
                    variant="outline"
                    className={cn(referralEnabled && CAMPAIGN_ENABLED_BADGE_CLASS)}
                  >
                    {referralEnabled ? 'あり' : 'なし'}
                  </Badge>
                </Field>
                <Field label="紹介者へのポイント付与">
                  <TextValue>
                    {campaign.referralBasePoints === null
                      ? DASH
                      : `${campaign.referralBasePoints.toLocaleString()}pt / 紹介成立ごと`}
                  </TextValue>
                </Field>
                <Field label="段階的増加">
                  <TextValue>
                    {campaign.referralTiers.length > 0
                      ? `あり（${campaign.referralTiers
                          .map(
                            (tier) =>
                              `${tier.minReferralCount}人目以降 ${tier.points.toLocaleString()}pt`,
                          )
                          .join('、')}）`
                      : 'なし'}
                  </TextValue>
                </Field>
                <Field label="ポイントリセット">
                  <TextValue>
                    {campaign.referralPointsAnnualReset ? '毎年3/31にリセット' : 'リセットなし'}
                  </TextValue>
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column (40%) */}
        <div className="w-[40%]">
          <div className="sticky top-0 flex flex-col gap-4">
            <CampaignAcceptancePanel campaign={campaign} />

            {/* Read-only; linking is managed in the store's 契約・料金 tab. Hidden in the 全店舗
                view and whenever the selected store is not the caller's own store. */}
            {showStoreUsage && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">店舗での利用</CardTitle>
                </CardHeader>
                <CardContent className="px-4">
                  <div className="flex flex-col gap-3">
                    <Field label={`現在の店舗（${myStoreUsage.storeName}）`}>
                      <div className="flex items-center gap-2">
                        {myStoreUsage.isLinked ? (
                          <Link2 className="text-muted-foreground size-4" />
                        ) : (
                          <Link2Off className="text-muted-foreground size-4" />
                        )}
                        <p className="text-sm font-medium">
                          {myStoreUsage.isLinked ? '利用中' : '未利用'}
                        </p>
                      </div>
                    </Field>
                    <p className="text-muted-foreground text-xs">
                      利用設定は店舗管理の契約・料金タブで行います
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto w-fit p-0 text-xs"
                      onClick={() => router.push(navigate('/stores'))}
                    >
                      店舗管理で設定
                      <ArrowRight className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">その他情報</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <div className="flex flex-col gap-4">
                  <Field label="作成日時">
                    <p className="text-sm">{formatDateYYYYMMDD_HHMM(campaign.createdAt)}</p>
                  </Field>
                  <Field label="更新日時">
                    <p className="text-sm">{formatDateYYYYMMDD_HHMM(campaign.updatedAt)}</p>
                  </Field>
                  <Field label="作成者">
                    <div className="flex items-center gap-2">
                      <div className="bg-muted flex size-6 items-center justify-center rounded-full text-[10px] font-medium">
                        {(campaign.createdByName ?? DASH).slice(0, 1)}
                      </div>
                      <p className="text-sm">{campaign.createdByName ?? DASH}</p>
                    </div>
                  </Field>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
