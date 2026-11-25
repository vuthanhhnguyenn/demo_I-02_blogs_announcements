'use client';

import Image from 'next/image';
import Link from 'next/link';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { formatYen } from '@/utils/format.util';
import { useQuery } from '@tanstack/react-query';
import { Check, ImageIcon, Network } from 'lucide-react';

import { Field } from '@/components/common/field';
import { JargonTip } from '@/components/common/jargon-tip';
import { StatusCard } from '@/components/common/status-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import {
  adminPlanControllerDetailOptions,
  adminStoreControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { PlanDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  MAIN_CONTRACT_STATUS_LABELS,
  MAIN_CONTRACT_TYPE_BADGE_CLASSES,
  MAIN_CONTRACT_TYPE_LABELS,
  PLAN_BRAND_BADGE_CLASSES,
  PLAN_BRAND_LABELS,
  PLAN_OTHER_STORE_AVAILABLE_LABELS,
  type PlanBrandEnum,
} from '../../_constants/constants';

interface BasicInfoTabProps {
  plan: PlanDetailDto;
}

/** 親／子主契約 open their own detail, the same way a list row does. */
function RelatedContractLink({
  planId,
  name,
  planCode,
}: Readonly<{ planId: string; name: string; planCode?: string }>) {
  return (
    <Link
      href={navigate('/contracts/[id]', planId)}
      className="text-primary w-fit max-w-full text-sm wrap-anywhere underline-offset-4 hover:underline"
    >
      {name}
      {planCode ? `（${planCode}）` : ''}
    </Link>
  );
}

function YesNoBadge({ enabled }: Readonly<{ enabled: boolean }>) {
  return enabled ? (
    <Badge variant="outline" className="border-success/20 bg-success/15 text-success text-[10px]">
      あり
    </Badge>
  ) : (
    <span className="text-muted-foreground text-sm">なし</span>
  );
}

export function BasicInfoTab({ plan }: BasicInfoTabProps) {
  const statusKey = plan.isActive ? 'active' : 'inactive';
  const isSpecialContract = plan.contractType === 'special';
  // `brandEnum` is a bare string on the DTO, so an unknown brand falls back to the raw value.
  const brand = plan.brandEnum as PlanBrandEnum;
  const thumbnail = [...plan.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];

  // The detail carries 店舗 and 親主契約 as ids only; their own detail endpoints give the 店舗名
  // and the 親主契約's 主契約ID shown next to its name.
  const { data: store } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: plan.storeId ?? '' } }),
    enabled: isSpecialContract && !!plan.storeId,
  });
  const { data: parentPlan } = useQuery({
    ...adminPlanControllerDetailOptions({ path: { planId: plan.parentPlanId ?? '' } }),
    enabled: !!plan.parentPlanId,
  });

  return (
    <div className="flex items-start gap-4">
      {/* Left (60%) */}
      <div className="flex w-[60%] min-w-0 flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label="主契約ID" value={plan.planCode} mono />
              <Field label="主契約名" value={plan.name} />
              <Field label="旧コード" value={plan.legacyCode ?? '―'} mono />
              <Field
                label="契約タイプ"
                value={
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${MAIN_CONTRACT_TYPE_BADGE_CLASSES[plan.contractType]}`}
                  >
                    {MAIN_CONTRACT_TYPE_LABELS[plan.contractType]}
                  </Badge>
                }
              />
              {/* G-01 FR-M002「店舗（特殊契約時に指定）」 — same rule as the list's 店舗 column. */}
              <Field label="店舗" value={(isSpecialContract && store?.name) || '―'} />
              <Field
                label="ブランド"
                value={
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${PLAN_BRAND_BADGE_CLASSES[brand] ?? 'bg-muted text-muted-foreground border-border'}`}
                  >
                    {PLAN_BRAND_LABELS[brand] ?? plan.brandEnum}
                  </Badge>
                }
              />
              <Field
                label="他店舗利用可否"
                value={PLAN_OTHER_STORE_AVAILABLE_LABELS[`${plan.otherStoreAvailable}`]}
              />
              {/* G-01: 相互利用 is a boolean flag only — its detailed parameters belong to Y-02-03. */}
              <Field label="相互利用" value={<YesNoBadge enabled={plan.isMultiUsable} />} />
              <Field label="主契約変更可否" value={plan.isChangeable ? '可' : '不可'} />
              <Field label="同伴特典" value={<YesNoBadge enabled={plan.hasCompanionBenefit} />} />
              {/* The prototype's 変更前主契約 is FR-M002「コピー元ID」— relabelled per API-087 v0.9 (GAP-172). */}
              <Field
                label="コピー元主契約"
                value={
                  plan.copiedFromPlanId && plan.copiedFromPlanCode ? (
                    <RelatedContractLink
                      planId={plan.copiedFromPlanId}
                      name={plan.copiedFromPlanName ?? plan.copiedFromPlanCode}
                      planCode={plan.copiedFromPlanCode}
                    />
                  ) : (
                    '―'
                  )
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">説明</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <p className="text-sm leading-relaxed wrap-anywhere">{plan.description || '―'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">会員公開設定</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-2 gap-6">
              <Field label="会員公開用主契約名" value={plan.nameForMember ?? '―'} />
              <Field label="企業" value={plan.corporateName ?? '―'} />
              <Field label="規約" value={plan.termsName ?? '―'} />
            </div>
            <div className="mt-4">
              <Label className="text-muted-foreground text-xs">説明文</Label>
              <p className="mt-1 text-sm leading-relaxed wrap-anywhere">
                {plan.publicDescription || '―'}
              </p>
            </div>
            {/* SC-008: every field the form writes is readable here; the spec's Key Entities put
                備考 under 会員公開設定 (the prototype has no slot for it). */}
            <div className="mt-4">
              <Label className="text-muted-foreground text-xs">備考</Label>
              <p className="mt-1 text-sm leading-relaxed wrap-anywhere">{plan.remarks || '―'}</p>
            </div>
            <div className="mt-4">
              <Label className="text-muted-foreground text-xs">サムネイル画像</Label>
              {thumbnail?.imageUrl ? (
                <div className="relative mt-2 h-24 w-40 overflow-hidden rounded-md border">
                  <Image
                    src={thumbnail.imageUrl}
                    alt="サムネイル"
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="160px"
                  />
                </div>
              ) : (
                <div className="bg-muted/50 mt-2 flex h-24 w-40 items-center justify-center rounded-md border border-dashed">
                  <div className="text-muted-foreground flex flex-col items-center gap-1">
                    <ImageIcon className="size-5" />
                    <span className="text-[10px]">未設定</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right (40%) */}
      <div className="w-[40%] min-w-0">
        <div className="sticky top-6 flex flex-col gap-4">
          <StatusCard
            tone={plan.isActive ? 'success' : 'muted'}
            icon={Check}
            label={MAIN_CONTRACT_STATUS_LABELS[statusKey]}
            meta={[
              `作成: ${formatDateYYYYMMDD_HHMM(plan.createdAt)}`,
              `更新: ${formatDateYYYYMMDD_HHMM(plan.updatedAt)}`,
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">料金・利用状況</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">料金（税込）</p>
                  <p className="text-lg font-semibold">{formatYen(plan.priceMonthly)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">休会時請求額</span>
                  <span className="text-sm font-semibold">
                    {formatYen(plan.suspensionFee, '―')}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-muted-foreground text-xs">現在の契約者数</span>
                  <span className="text-sm font-semibold">
                    {plan.contractCount.toLocaleString()}名
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Network className="text-muted-foreground size-4" />
                契約マスタの関係
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">
                    <JargonTip term="主契約">親主契約</JargonTip>
                  </p>
                  {plan.parentPlanId && plan.parentPlanName ? (
                    <RelatedContractLink
                      planId={plan.parentPlanId}
                      name={plan.parentPlanName}
                      planCode={parentPlan?.planCode}
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">なし</span>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">
                    子主契約（{plan.derivedChildren.length}件）
                  </p>
                  {plan.derivedChildren.length > 0 ? (
                    <div className="flex flex-col items-start gap-1">
                      {plan.derivedChildren.map((child) => (
                        <RelatedContractLink
                          key={child.planId}
                          planId={child.planId}
                          name={child.name}
                          planCode={child.planCode}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">なし</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
