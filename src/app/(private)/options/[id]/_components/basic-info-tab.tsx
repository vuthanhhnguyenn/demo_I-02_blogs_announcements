'use client';

import Image from 'next/image';
import Link from 'next/link';

import { AvailableAreasReadout } from '@/app/(private)/area-master/_components/available-areas';
import { ALL_STORES, useCurrentStore } from '@/contexts/current-store.context';
import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { formatYen } from '@/utils/format.util';
import { toTaxExcludedPrice } from '@/utils/tax.util';
import { ArrowRight, Crown, ImageIcon, Package } from 'lucide-react';

import { BrandBadge } from '@/components/common/brand-badge';
import { Field } from '@/components/common/field';
import { StatusCard } from '@/components/common/status-card';
import { StoreScopeCount } from '@/components/common/store-scope-count';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { OptionDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  OPTION_DETAIL_CATEGORY_LABELS,
  OPTION_LIST_PRORATION_METHOD_LABELS,
  OPTION_LIST_STATUS_LABELS,
  OPTION_LIST_TYPE_BADGE_CLASSES,
  OPTION_LIST_TYPE_LABELS,
  OPTION_LIST_USABILITY_LABELS,
  OPTION_SUBCATEGORY_LABELS,
  allowsMemberChange,
  isLockerContractType,
} from '../../_constants/constants';

interface BasicInfoTabProps {
  option: OptionDetailDto;
}

export function BasicInfoTab({ option }: BasicInfoTabProps) {
  const isActive = option.isActive;
  const isLockerContract = isLockerContractType(option);
  // The header store switcher: "店舗での利用" only makes sense once a single store is picked.
  const { currentStoreId } = useCurrentStore();
  const isStoreScoped = currentStoreId !== ALL_STORES;

  return (
    <div className="flex items-start gap-4">
      <div className="flex w-[60%] flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label="オプションID" value={option.optionCode} mono />
              <Field label="オプション名" value={option.name} />
              <Field label="ブランド" value={<BrandBadge brand={option.brandEnum} />} />
              <Field
                label="オプション分類"
                value={OPTION_DETAIL_CATEGORY_LABELS[option.category]}
              />
              {/* G-02 FR-003: 適用店舗 lists the stores that picked this option in their own sales
                  setting — count + store chips, or the empty note when no store has picked it. */}
              <div className="col-span-2">
                <Field
                  label="適用店舗"
                  value={
                    <div className="flex flex-col gap-2">
                      {option.storeCount > 0 && (
                        <StoreScopeCount count={option.storeCount} size="md" />
                      )}
                      {option.storeNames.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {option.storeNames.map((storeName) => (
                            <Badge
                              key={storeName}
                              variant="outline"
                              className="max-w-full text-xs font-normal"
                            >
                              <TextWithTooltip text={storeName} />
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs">適用店舗がありません</p>
                      )}
                    </div>
                  }
                />
              </div>
              <div className="col-span-2">
                {/* API-085: `description` is the internal 備考; the member-facing text is
                    `publicDescription` (qa-110). */}
                <Field
                  label="備考"
                  value={<span className="whitespace-pre-wrap">{option.description ?? '―'}</span>}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">料金情報</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field
                label="月額料金（税込）"
                value={
                  <span className="text-lg font-semibold">{formatYen(option.feeMonthly)}</span>
                }
              />
              <Field label="税率" value={`${option.taxRate}%`} />
              <Field
                label="税抜金額"
                value={
                  <span className="text-lg font-semibold">
                    {formatYen(toTaxExcludedPrice(option.feeMonthly, option.taxRate))}
                  </span>
                }
              />
              <Field label="会計コード" value={option.accountCode ?? '―'} mono />
              <Field label="日割り要否" value={option.isProration ? '適用する' : '適用しない'} />
              {option.isProration && (
                <Field
                  label="日割り計算方式"
                  value={OPTION_LIST_PRORATION_METHOD_LABELS[option.prorationMethod]}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">オプション種別・利用可否</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field
                label="オプション種別"
                value={
                  <Badge
                    variant="outline"
                    className={`text-xs font-normal ${OPTION_LIST_TYPE_BADGE_CLASSES[option.optionType]}`}
                  >
                    {OPTION_LIST_TYPE_LABELS[option.optionType]}
                  </Badge>
                }
              />
              <Field
                label="サービス種別"
                value={option.subcategory ? OPTION_SUBCATEGORY_LABELS[option.subcategory] : '―'}
              />
              <div className="col-span-2">
                <Field
                  label="利用可否ルール"
                  value={OPTION_LIST_USABILITY_LABELS[option.usability]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">制約設定</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field
                label="主オプション契約変更可否"
                value={option.isChangeableOnPlanChange ? '可' : '不可'}
              />
              <Field
                label="変更可否"
                value={allowsMemberChange(option.usability) ? '可' : '不可'}
              />
            </div>
          </CardContent>
        </Card>

        {/* 利用できるエリア (G-02 FR-002, prototype 11/12) — same title and content as the form; none = 設定なし. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">利用できるエリア</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <AvailableAreasReadout subject="option" areas={option.areas} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">会員公開設定</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">説明文</span>
                <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
                  {option.publicDescription || '―'}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">会員公開用画像</span>
                {option.primaryImageUrl ? (
                  <div className="relative mt-1 h-24 w-40 overflow-hidden rounded-md border">
                    <Image
                      src={option.primaryImageUrl}
                      alt="会員公開用画像"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-muted/50 mt-1 flex h-24 w-40 items-center justify-center rounded-md border border-dashed">
                    <div className="text-muted-foreground flex flex-col items-center gap-1">
                      <ImageIcon className="size-5" />
                      <span className="text-[10px]">未設定</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-[40%]">
        <div className="sticky top-6 flex flex-col gap-4">
          <StatusCard
            tone={isActive ? 'success' : 'muted'}
            icon={Package}
            label={OPTION_LIST_STATUS_LABELS[isActive ? 'active' : 'inactive']}
            meta={`更新: ${formatDateYYYYMMDD_HHMM(option.updatedAt)}`}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">利用状況</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {/* G-02 FR-002/FR-003: 紐付け契約数 = the current contractor count (same thing), so
                  there is no separate 利用会員数 row. */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    {isLockerContract
                      ? '紐付け契約数（割当スロット）'
                      : '紐付け契約数（現在の契約者数）'}
                  </span>
                  <span className="text-sm font-semibold">{option.activeContractCount}件</span>
                </div>
                {/* API-085 always ranks every option (ties shared), so the row is never hidden. */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">人気ランキング</span>
                  <div className="flex items-center gap-1">
                    <Crown className="text-warning size-4" />
                    <span className="text-sm font-semibold">{option.popularityRank}位</span>
                    <span className="text-muted-foreground text-xs">
                      / {option.popularityRankOf}オプション中
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* E-01 linkage: locker slots reference this option by its code as the 契約形態コード. */}
          {isLockerContract && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">ロッカー契約種類</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <div className="flex flex-col gap-3">
                  <Field label="契約形態コード" value={option.optionCode} mono />
                  <p className="text-muted-foreground text-xs">
                    ロッカー管理のスロットにこのコードで紐づき、契約時にスロットの設定に従って自動適用されます。料金の正はこのオプションです。スロットへの割当はロッカー管理で行います
                  </p>
                  <Link
                    href={navigate('/lockers')}
                    className="text-primary inline-flex w-fit items-center gap-1 text-xs hover:underline"
                  >
                    ロッカー管理で割当を確認
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guidance only — whether the store uses this option is owned by the store detail's
              契約・料金 tab, so no in-use judgement here. Hidden in the all-stores view. */}
          {isStoreScoped && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">店舗での利用</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <div className="flex flex-col gap-3">
                  <p className="text-muted-foreground text-xs">
                    店舗での利用状況は店舗管理の契約・料金タブで確認できます
                  </p>
                  <Link
                    href={navigate('/stores/[id]', currentStoreId, { tab: 'contract' })}
                    className="text-primary inline-flex w-fit items-center gap-1 text-xs hover:underline"
                  >
                    店舗管理で確認
                    <ArrowRight className="size-3" />
                  </Link>
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
                <Field label="作成日時" value={formatDateYYYYMMDD_HHMM(option.createdAt)} />
                <Field label="更新日時" value={formatDateYYYYMMDD_HHMM(option.updatedAt)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
