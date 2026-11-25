'use client';

import { useState } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { formatYen } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';

import { Error as ErrorView } from '@/components/common/data-state-boundary/error';
import { TablePagination } from '@/components/common/table-pagination';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
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

import { adminOptionControllerHistoryOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { OptionChangeHistoryItemDto } from '@/lib/api-real/types.gen';

import {
  OPTION_DETAIL_CATEGORY_LABELS,
  OPTION_LIST_PRORATION_METHOD_LABELS,
  OPTION_LIST_USABILITY_LABELS,
  OPTION_SUBCATEGORY_LABELS,
} from '../../_constants/constants';

const HISTORY_PAGE_LIMIT = 20;

const STATUS_FIELD_LABEL = 'ステータス';
const CREATED_LABEL = '新規作成';

interface HistoryRow {
  key: string;
  date: string;
  user: string;
  field: string | null;
  from: string | null;
  to: string | null;
}

type ValueFormatter = (value: unknown) => string;

function lookup(labels: Record<string, string>): ValueFormatter {
  return (value) => labels[String(value)] ?? String(value);
}

const yesNo: ValueFormatter = (value) => (value ? '可' : '不可');

/**
 * Snapshot keys the table shows, with their field label and value formatter. Bookkeeping keys
 * (`id`, `createdAt`, `updatedBy`…) are left out; an unknown key falls back to its raw name.
 */
const FIELD_DISPLAY: Record<string, { label: string; format: ValueFormatter }> = {
  name: { label: 'オプション名', format: String },
  brandEnum: { label: 'ブランド', format: String },
  category: { label: 'オプション分類', format: lookup(OPTION_DETAIL_CATEGORY_LABELS) },
  subcategory: { label: 'サービス種別', format: lookup(OPTION_SUBCATEGORY_LABELS) },
  paymentType: {
    label: '課金種別',
    format: lookup({ monthly_billing: '月額', per_use: '都度' }),
  },
  isAutoAssigned: { label: '自動付与', format: yesNo },
  feeMonthly: {
    label: '月額料金（税込）',
    format: (value) => formatYen(Number(value)),
  },
  taxRate: { label: '税率', format: (value) => `${String(value)}%` },
  isProration: {
    label: '日割り要否',
    format: (value) => (value ? '適用する' : '適用しない'),
  },
  prorationMethod: {
    label: '日割り計算方式',
    format: lookup(OPTION_LIST_PRORATION_METHOD_LABELS),
  },
  usability: { label: '利用可否ルール', format: lookup(OPTION_LIST_USABILITY_LABELS) },
  isChangeableOnPlanChange: { label: '主オプション契約変更可否', format: yesNo },
  // 利用できるエリア: area ids, named by `toRows` from the history response's `areas`.
  areaIds: { label: '利用できるエリア', format: String },
  monthlySessionCount: { label: '月間回数', format: String },
  accountCode: { label: '会計コード', format: String },
  isActive: { label: STATUS_FIELD_LABEL, format: (value) => (value ? '有効' : '無効') },
  description: { label: '備考', format: String },
  publicDescription: { label: '説明文', format: String },
};

const IGNORED_FIELDS = new Set([
  'id',
  'optionCode',
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy',
  'storeCount',
  'storeNames',
  'primaryImageUrl',
]);

/** Image add/update/delete are `updated` events told apart by `metadata.action`. */
const IMAGE_ACTION_LABELS: Record<string, string> = {
  image_add: '追加',
  image_update: '更新',
  image_delete: '削除',
};

function formatValue(
  field: string,
  value: unknown,
  areaNames: ReadonlyMap<string, string>,
): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value) && value.length === 0) return null;
  if (field === 'areaIds' && Array.isArray(value)) {
    return value.map((id) => areaNames.get(String(id)) ?? String(id)).join('、');
  }
  const format = FIELD_DISPLAY[field]?.format ?? String;
  return format(value);
}

/** One event can change several fields — the table shows one row per changed field. */
function toRows(
  item: OptionChangeHistoryItemDto,
  areaNames: ReadonlyMap<string, string>,
): HistoryRow[] {
  const base = {
    date: formatDateYYYYMMDD_HHMM(item.changedAt),
    user: item.changedByName || '―',
  };

  if (item.eventType === 'created') {
    return [{ ...base, key: item.id, field: null, from: null, to: CREATED_LABEL }];
  }

  const action = typeof item.metadata?.action === 'string' ? item.metadata.action : null;
  if (action && IMAGE_ACTION_LABELS[action]) {
    return [
      {
        ...base,
        key: item.id,
        field: '会員公開用画像',
        from: null,
        to: IMAGE_ACTION_LABELS[action],
      },
    ];
  }

  const changes = Object.entries(item.diff ?? {}).filter(([field]) => !IGNORED_FIELDS.has(field));
  // `diff` is null for the oldest entry of a page — nothing to compare against.
  if (changes.length === 0) {
    return [{ ...base, key: item.id, field: null, from: null, to: null }];
  }
  return changes.map(([field, change]) => ({
    ...base,
    key: `${item.id}-${field}`,
    field: FIELD_DISPLAY[field]?.label ?? field,
    from: formatValue(field, change.prev, areaNames),
    to: formatValue(field, change.next, areaNames),
  }));
}

interface HistoryTabProps {
  optionId: string;
}

export function HistoryTab({ optionId }: HistoryTabProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useQuery({
    ...adminOptionControllerHistoryOptions({
      path: { optionId },
      query: { page, limit: HISTORY_PAGE_LIMIT },
    }),
    placeholderData: keepPreviousData,
  });
  const pagination = data?.pagination;

  // The response names every area its 利用できるエリア diffs mention, deleted ones included.
  const areaNames = new Map((data?.areas ?? []).map((a) => [a.id, a.name]));
  const history: HistoryRow[] = (data?.items ?? []).flatMap((item) => toRows(item, areaNames));

  if (isLoading) {
    return (
      <Card className="gap-0 py-0">
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <ErrorView
        title="変更履歴を取得できませんでした"
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const dash = <span className="text-muted-foreground">&mdash;</span>;

  return (
    <Card className="gap-0 py-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold">更新日時</TableHead>
            <TableHead className="text-xs font-semibold">操作者</TableHead>
            <TableHead className="text-xs font-semibold">変更フィールド</TableHead>
            <TableHead className="text-xs font-semibold">変更前</TableHead>
            <TableHead className="w-12 text-center text-xs font-semibold" />
            <TableHead className="text-xs font-semibold">変更後</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-sm">
                変更履歴はありません
              </TableCell>
            </TableRow>
          ) : (
            history.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="text-sm">{row.date}</TableCell>
                <TableCell className="text-sm">{row.user}</TableCell>
                <TableCell className="text-sm font-medium">{row.field ?? dash}</TableCell>
                <TableCell className="max-w-50 text-sm">
                  {row.from ? <TextWithTooltip text={row.from} /> : dash}
                </TableCell>
                <TableCell className="text-center">
                  <ArrowRight className="text-muted-foreground inline size-4" />
                </TableCell>
                <TableCell className="max-w-50 truncate text-sm">
                  {row.field === STATUS_FIELD_LABEL ? (
                    <Badge
                      variant="outline"
                      className={`gap-1 text-xs font-medium ${
                        row.to === '有効'
                          ? 'bg-success/15 text-success border-success/20'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {row.to}
                    </Badge>
                  ) : row.to === CREATED_LABEL ? (
                    <Badge
                      variant="outline"
                      className="border-info/20 bg-info/15 text-info text-xs font-medium"
                    >
                      {row.to}
                    </Badge>
                  ) : row.to ? (
                    <TextWithTooltip text={row.to} />
                  ) : (
                    dash
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {pagination && pagination.totalItems > 0 && (
        <TablePagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.totalItems}
          limit={pagination.limit}
          onPageChange={setPage}
          showPageNumbers={false}
          showTotalPrefix
        />
      )}
    </Card>
  );
}
