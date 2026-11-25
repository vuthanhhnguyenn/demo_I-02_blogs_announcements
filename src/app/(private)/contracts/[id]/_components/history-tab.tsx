'use client';

import { useState } from 'react';

import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { formatYen } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { TablePagination } from '@/components/common/table-pagination';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminPlanControllerHistoryOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { PlanChangeHistoryItemDto, PlanDetailDto } from '@/lib/api-real/types.gen';

import {
  MAIN_CONTRACT_TYPE_LABELS,
  PLAN_BRAND_LABELS,
  PLAN_LIMIT_OF_SEX_LABELS,
} from '../../_constants/constants';
import { PLAN_USAGE_DAYS, PLAN_USAGE_DAY_LABELS } from '../../_schemas/contract-form.schema';

const PAGE_LIMIT = 20;

const STATUS_FIELD_LABEL = 'ステータス';

type PlanField = keyof PlanDetailDto;

/** 変更フィールド label per `diff` key — the same wording the detail and the form use. */
const FIELD_LABELS: Partial<Record<PlanField, string>> = {
  name: '主契約名',
  legacyCode: '旧コード',
  contractType: '契約タイプ',
  brandEnum: 'ブランド',
  storeId: '店舗',
  parentPlanId: '親主契約',
  parentPlanName: '親主契約',
  otherStoreAvailable: '他店舗利用可否',
  isMultiUsable: '相互利用',
  isChangeable: '主契約変更可否',
  isCopyable: 'コピー可否',
  hasCompanionBenefit: '同伴特典',
  description: '説明',
  remarks: '備考',
  nameForMember: '会員公開用主契約名',
  publicDescription: '会員公開用説明文',
  corporateId: '企業',
  corporateName: '企業',
  termsId: '規約',
  termsName: '規約',
  images: 'サムネイル画像',
  priceMonthly: '料金（税込）',
  taxRate: '税率',
  cancellationFee: '違約金',
  suspensionFee: '休会時請求金額',
  enrollmentFee: '入会金（税込）',
  registrationFee: '登録事務手数料（税込）',
  cardIssueFee: '会員カード発行料（税込）',
  maintenanceFee: 'セキュリティ管理／施設メンテナンス料（税込）',
  accountingCode: '会計コード',
  usageStartDate: '利用開始日',
  monthlyVisitLimit: '月額会員回数上限',
  usageHours: '利用可能時間',
  suspendableMonths: '休会可能月',
  cancellationFeeMonths: '退会可能月',
  prepaidMonths: '初回支払月数',
  sameMonthWithdrawalAllowed: '退会申請当月の退会',
  minAge: '年齢制限（下限）',
  maxAge: '年齢制限（上限）',
  limitOfSex: '性別制限',
  areaIds: '利用できるエリア',
  hasBilling: '課金有無',
  isActive: STATUS_FIELD_LABEL,
};

/**
 * Bookkeeping keys a change always touches, and the ids whose name twin (`parentPlanName`,
 * `corporateName`, `termsName`) is the readable half of the same change.
 */
const HIDDEN_FIELDS = new Set<string>([
  'planId',
  'planCode',
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy',
  'deletedAt',
  'copiedFromPlanId',
  'parentPlanId',
  'corporateId',
  'termsId',
]);

const YEN_FIELDS = new Set<string>([
  'priceMonthly',
  'cancellationFee',
  'suspensionFee',
  'enrollmentFee',
  'registrationFee',
  'cardIssueFee',
  'maintenanceFee',
]);

const MONTH_FIELDS = new Set<string>([
  'suspendableMonths',
  'cancellationFeeMonths',
  'prepaidMonths',
]);

const ALLOWED_FIELDS = new Set<string>([
  'otherStoreAvailable',
  'isChangeable',
  'isCopyable',
  'sameMonthWithdrawalAllowed',
]);

const EVENT_LABELS: Record<PlanChangeHistoryItemDto['eventType'], string> = {
  created: '新規作成',
  updated: '更新',
  deleted: '削除',
  restored: '復元',
};

interface HistoryRow {
  key: string;
  changedAt: string;
  changedBy: string;
  field: string | null;
  from: string | null;
  to: string | null;
}

/** A cleared / absent value — the prototype's muted em dash, the same on both sides. */
function EmptyValue() {
  return <span className="text-muted-foreground">&mdash;</span>;
}

/** 変更前 / 変更後 truncate like the prototype (`max-w-xs truncate`); the tooltip keeps the full value readable. */
function DiffValue({ text }: Readonly<{ text: string }>) {
  return <TextWithTooltip text={text} className="max-w-xs" />;
}

function usageHoursLabel(value: unknown): string {
  if (!Array.isArray(value)) return String(value);
  // The API keeps no day order, so print 月 → 祝日 like the 料金・条件 tab.
  return [...value]
    .sort(
      (
        a: Partial<PlanDetailDto['usageHours'][number]>,
        b: Partial<PlanDetailDto['usageHours'][number]>,
      ) =>
        (a.dayOfWeek ? PLAN_USAGE_DAYS.indexOf(a.dayOfWeek) : 99) -
        (b.dayOfWeek ? PLAN_USAGE_DAYS.indexOf(b.dayOfWeek) : 99),
    )
    .map((row: Partial<PlanDetailDto['usageHours'][number]>) => {
      const day = row.dayOfWeek ? PLAN_USAGE_DAY_LABELS[row.dayOfWeek] : '';
      return row.isClosed ? `${day} 休業` : `${day} ${row.openTime ?? ''}〜${row.closeTime ?? ''}`;
    })
    .join(' / ');
}

/** Renders one `diff` side; the API types it as an object, but it carries the field's own value. */
function formatValue(
  field: string,
  value: unknown,
  areaNames: ReadonlyMap<string, string>,
): string | null {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  // 利用できるエリア: area ids, named from the history response's `areas`.
  if (field === 'areaIds' && Array.isArray(value)) {
    return value.map((id) => areaNames.get(String(id)) ?? String(id)).join('、');
  }
  if (typeof value === 'boolean') {
    if (field === 'isActive') return value ? '有効' : '無効';
    if (ALLOWED_FIELDS.has(field)) return value ? '可' : '不可';
    return value ? 'あり' : 'なし';
  }
  if (typeof value === 'number') {
    if (YEN_FIELDS.has(field)) return formatYen(value);
    if (MONTH_FIELDS.has(field)) return `${value}ヶ月`;
    if (field === 'taxRate') return `${value}%`;
    if (field === 'monthlyVisitLimit') return `${value}回/月`;
    if (field === 'minAge' || field === 'maxAge') return `${value}歳`;
    return value.toLocaleString();
  }
  if (field === 'usageHours') return usageHoursLabel(value);
  if (field === 'images') return '設定あり';
  if (typeof value === 'string') {
    if (field === 'contractType') {
      return MAIN_CONTRACT_TYPE_LABELS[value as keyof typeof MAIN_CONTRACT_TYPE_LABELS] ?? value;
    }
    if (field === 'brandEnum') {
      return PLAN_BRAND_LABELS[value as keyof typeof PLAN_BRAND_LABELS] ?? value;
    }
    if (field === 'limitOfSex') {
      return PLAN_LIMIT_OF_SEX_LABELS[value as keyof typeof PLAN_LIMIT_OF_SEX_LABELS] ?? value;
    }
    if (field === 'usageStartDate') return formatDateYYYYMMDD(value, value);
    return value;
  }
  return JSON.stringify(value);
}

/** One history entry becomes one row per changed field (G-01 FR-S001 項目差分). */
function toHistoryRows(
  item: PlanChangeHistoryItemDto,
  areaNames: ReadonlyMap<string, string>,
): HistoryRow[] {
  const base = {
    changedAt: formatDateYYYYMMDD_HHMM(item.changedAt),
    changedBy: item.changedByName ?? '―',
  };
  const fields = Object.entries(item.diff ?? {}).filter(([field]) => !HIDDEN_FIELDS.has(field));

  if (item.eventType !== 'updated' || fields.length === 0) {
    return [{ ...base, key: item.id, field: null, from: null, to: EVENT_LABELS[item.eventType] }];
  }

  return fields.map(([field, entry]) => {
    const prev: unknown = entry.prev;
    const next: unknown = entry.next;
    return {
      ...base,
      key: `${item.id}-${field}`,
      field: FIELD_LABELS[field as PlanField] ?? field,
      from: formatValue(field, prev, areaNames),
      to: formatValue(field, next, areaNames),
    };
  });
}

interface HistoryTabProps {
  planId: string;
}

export function HistoryTab({ planId }: HistoryTabProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminPlanControllerHistoryOptions({
      path: { planId },
      query: { page, limit: PAGE_LIMIT },
    }),
    placeholderData: keepPreviousData,
  });

  // The response names every area its 利用できるエリア diffs mention, deleted ones included.
  const areaNames = new Map((data?.areas ?? []).map((a) => [a.id, a.name]));
  const rows = (data?.items ?? []).flatMap((item) => toHistoryRows(item, areaNames));
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <Card className="gap-0 py-0">
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-0 py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold">更新日時</TableHead>
            <TableHead className="text-xs font-semibold">変更者</TableHead>
            <TableHead className="text-xs font-semibold">変更フィールド</TableHead>
            <TableHead className="text-xs font-semibold">変更前</TableHead>
            <TableHead className="w-12 text-center text-xs font-semibold" />
            <TableHead className="text-xs font-semibold">変更後</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isError && (
            <TableRow>
              <TableCell colSpan={6}>
                <div className="flex flex-col items-center gap-3 py-10">
                  <p className="text-muted-foreground text-sm">変更履歴の取得に失敗しました</p>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => refetch()}>
                    再試行
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          {!isError && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6}>
                <Empty variant="empty" entityLabel="変更履歴" />
              </TableCell>
            </TableRow>
          )}
          {!isError &&
            rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="text-sm">{row.changedAt}</TableCell>
                <TableCell className="text-sm">{row.changedBy}</TableCell>
                <TableCell className="text-sm font-medium">{row.field ?? <EmptyValue />}</TableCell>
                <TableCell className="max-w-xs text-sm">
                  {row.from ? <DiffValue text={row.from} /> : <EmptyValue />}
                </TableCell>
                <TableCell className="text-center">
                  <ArrowRight className="text-muted-foreground inline size-4" />
                </TableCell>
                <TableCell className="max-w-xs text-sm">
                  {row.to === null ? (
                    <EmptyValue />
                  ) : row.field === STATUS_FIELD_LABEL ? (
                    <Badge
                      variant="outline"
                      className={`gap-1 text-xs font-medium ${
                        row.to === '有効'
                          ? 'border-success/20 bg-success/15 text-success'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {row.to}
                    </Badge>
                  ) : row.field === null ? (
                    <Badge
                      variant="outline"
                      className="border-info/20 bg-info/15 text-info text-xs font-medium"
                    >
                      {row.to}
                    </Badge>
                  ) : (
                    <DiffValue text={row.to} />
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      {pagination && pagination.totalPages > 1 && (
        <TablePagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.totalItems}
          limit={pagination.limit}
          onPageChange={setPage}
          isLoading={isFetching}
        />
      )}
    </Card>
  );
}
