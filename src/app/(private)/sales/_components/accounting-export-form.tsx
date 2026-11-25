'use client';

// Client component: FR-008 会計連携CSV出力 (prototype `sales-accounting-export`) on API-119 §8–§10.
// Async like the refund CSV: create (202, one row per file) → poll §9 → signed `csvUrl` → download.
import { useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useCurrentStore } from '@/contexts/current-store.context';
import { formatDateTime } from '@/utils/format.util';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';

import { useCurrentUser } from '@/hooks/use-current-user';
import { useBackToListHref } from '@/hooks/use-return-to.hook';

import { BackLink } from '@/components/common/back-link';
import {
  StoreSelectInput,
  useStoreLabel,
} from '@/components/common/data-select-input/store-select-input';
import { MonthPicker } from '@/components/common/month-picker';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

import { AdminWriteOff__AccountingApi119 } from '@/lib/api-real';
import {
  adminSalesBillingControllerSummaryOptions,
  adminWriteoffAccountingControllerDownloadExportOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  AccountingExportListItemDto,
  AdminWriteoffAccountingControllerCreateAccountingExportsData,
} from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { formatYen } from '../_constants/sales-labels.constant';
import { fetchExportRows, useExportRows } from '../_hooks/use-export-rows.hook';
import { useSalesStoreScope } from '../_hooks/use-sales-store-scope.hook';
import {
  EXPORT_POLL_INTERVAL_MS,
  EXPORT_POLL_MAX_ATTEMPTS,
  exportError,
  isExportRunning,
  readKeptExports,
  sleep,
  triggerDownload,
  writeKeptExports,
} from '../_utils/accounting-export.util';
import { previousMonth } from '../_utils/billing-month.util';

type CreateBody = AdminWriteoffAccountingControllerCreateAccountingExportsData['body'];
type JournalType = CreateBody['journalTypes'][number];
type Packaging = NonNullable<CreateBody['packaging']>;
type ExportType = AccountingExportListItemDto['exportType'];

/**
 * FR-008's 5 仕訳種別. API-119 §8: 売上 is split into `monthly_sales` + `enrollment_journal`
 * (the pre-discount 入会金, #393), so that checkbox sends both.
 */
const JOURNAL_ITEMS: {
  key: string;
  label: string;
  description: string;
  journalTypes: JournalType[];
}[] = [
  {
    key: 'sales',
    label: '売上',
    description: '売掛/売上 or 現金/売上（入会金を含む）',
    journalTypes: ['monthly_sales', 'enrollment_journal'],
  },
  {
    key: 'receipt',
    label: '入金',
    description: '入金確認済みの決済データ',
    journalTypes: ['receipt_journal'],
  },
  {
    key: 'refund',
    label: '返金（売上訂正）',
    description: '承認済みの返金データ',
    journalTypes: ['refund_journal'],
  },
  {
    key: 'expense',
    label: '支払',
    description: '決済手数料等の支払データ',
    journalTypes: ['expense_journal'],
  },
  { key: 'badDebt', label: '貸倒', description: '貸倒確定データ', journalTypes: ['bad_debt'] },
];

const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  monthly_sales: '売上（月額）',
  enrollment_journal: '売上（入会金）',
  receipt_journal: '入金',
  refund_journal: '返金（売上訂正）',
  expense_journal: '支払',
  bad_debt: '貸倒',
  bundled: '一括',
};

const keptExportsKey = (staffId: string) => `sales.accounting-csv-exports:${staffId}`;

type KeptExport = { exportId: string; exportType: ExportType; exportMonth: string };

type ExportOutcome = {
  /** Ready to download — offered as a click, never auto-downloaded (see below) */
  readyIds: string[];
  empty: number;
  failed: number;
  running: number;
};

function formatMonthLabel(month: string): string {
  const [year, monthPart] = month.split('-');
  return `${year}年${Number(monthPart)}月分`;
}

function toPickerValue(month: string): string {
  return month.replace('-', '/');
}

export function AccountingExportForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const backToListHref = useBackToListHref(navigate('/sales'));
  const staffId = useCurrentUser().data?.staffId ?? '';
  // The export target is picked on screen (one store, or 全店舗 = every store in the caller's
  // scope). A specific header store fixes it (FR-021) — Manager / Staff always have one, so they
  // never send a store outside their scope.
  const [targetStoreId, setTargetStoreId] = useState<string | null>(null);
  const { showStoreFilter, effectiveStoreId, isScopeLoading } = useSalesStoreScope(
    targetStoreId,
    () => setTargetStoreId(null),
  );
  const storeIds = effectiveStoreId ? [effectiveStoreId] : [];
  // The locked picker does not fetch, so the header store's name is supplied here
  const { restrictedStores } = useCurrentStore();
  const restrictedHeaderStore = showStoreFilter
    ? undefined
    : restrictedStores.find((store) => store.id === effectiveStoreId);
  const { label: headerStoreLabel } = useStoreLabel(effectiveStoreId, {
    enabled: !showStoreFilter && !restrictedHeaderStore,
  });

  const targetMonth = previousMonth();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(JOURNAL_ITEMS.map((item) => item.key)),
  );
  const [packaging, setPackaging] = useState<Packaging>('individual');
  const [keptExports, setKeptExports] = useState<KeptExport[]>([]);
  const [prevStaffId, setPrevStaffId] = useState('');
  if (staffId !== prevStaffId) {
    setPrevStaffId(staffId);
    setKeptExports(staffId ? readKeptExports<KeptExport>(keptExportsKey(staffId)) : []);
  }
  const submittingRef = useRef(false);
  // API-119 §8 Idempotency-Key: the same request body keeps its key while the screen is open, so a
  // retry or a repeated click returns the rows already queued (24h replay) instead of a second set
  const idempotencyKeys = useRef(new Map<string, string>());

  // API-119 §8: the FE draws the pre-export warning from API-114 §4 confirmStatusCounts
  const { data: summary } = useQuery({
    ...adminSalesBillingControllerSummaryOptions({
      query: { month: targetMonth, storeIds: storeIds.length > 0 ? storeIds : undefined },
    }),
    enabled: !isScopeLoading,
  });
  const unconfirmedCount = summary
    ? summary.confirmStatusCounts.pending + summary.confirmStatusCounts.unconfirmed
    : 0;

  function updateKept(update: (current: KeptExport[]) => KeptExport[]) {
    setKeptExports((current) => {
      const next = update(current);
      writeKeptExports(keptExportsKey(staffId), next);
      return next;
    });
  }

  function forgetExport(exportId: string) {
    updateKept((current) => current.filter((item) => item.exportId !== exportId));
  }

  async function downloadExport(exportId: string) {
    const download = await queryClient.fetchQuery({
      ...adminWriteoffAccountingControllerDownloadExportOptions({ path: { exportId } }),
      staleTime: 0,
    });
    triggerDownload(download.csvUrl, download.fileName);
  }

  const downloadMutation = useMutation({
    mutationFn: (exportId: string) => downloadExport(exportId),
    onSuccess: (_, exportId) => {
      forgetExport(exportId);
      toast.success('会計連携CSVをダウンロードしました');
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (body: CreateBody): Promise<ExportOutcome> => {
      const bodyKey = JSON.stringify(body);
      const idempotencyKey = idempotencyKeys.current.get(bodyKey) ?? crypto.randomUUID();
      idempotencyKeys.current.set(bodyKey, idempotencyKey);
      const { data: accepted } =
        await AdminWriteOff__AccountingApi119.adminWriteoffAccountingControllerCreateAccountingExports(
          { body, headers: { 'idempotency-key': idempotencyKey }, throwOnError: true },
        );
      const created: KeptExport[] = accepted.exports.map((row) => ({
        exportId: row.exportId,
        exportType: row.exportType,
        exportMonth: row.exportMonth,
      }));
      const createdIds = new Set(created.map((item) => item.exportId));
      updateKept((current) => [
        ...created,
        ...current.filter((item) => !createdIds.has(item.exportId)),
      ]);

      let rows: AccountingExportListItemDto[] = [];
      for (let attempt = 0; attempt < EXPORT_POLL_MAX_ATTEMPTS; attempt += 1) {
        await sleep(EXPORT_POLL_INTERVAL_MS);
        const polled = await fetchExportRows(queryClient, [...createdIds]);
        rows = polled.filter((row) => createdIds.has(row.exportId));
        if (rows.length === createdIds.size && !rows.some(isExportRunning)) break;
      }

      const settled = rows.filter((row) => !isExportRunning(row));
      const failed = settled.filter((row) => row.status === 'failed' || row.status === 'expired');
      const empty = settled.filter((row) => row.status === 'exported' && row.totalRecords === 0);
      const ready = settled.filter((row) => row.status === 'exported' && row.totalRecords > 0);
      // Failed / empty rows stay in 作成を依頼したCSV with their state and 削除
      if (failed.length === createdIds.size) {
        throw exportError(failed[0]?.failureReason ?? 'CSVの作成に失敗しました');
      }
      // Never download here: after up to 30s of polling the click's user activation is gone and
      // browsers block the download — the toast action / list button starts it from a click
      return {
        readyIds: ready.map((row) => row.exportId),
        empty: empty.length,
        failed: failed.length,
        running: createdIds.size - settled.length,
      };
    },
    onSuccess: ({ readyIds, empty, failed, running }) => {
      if (failed > 0) toast.warning(`${failed}件のCSVを作成できませんでした`);
      if (readyIds.length === 1) {
        const [exportId] = readyIds;
        toast.success('会計連携CSVを作成しました', {
          action: { label: 'ダウンロード', onClick: () => downloadMutation.mutate(exportId) },
        });
      } else if (readyIds.length > 1) {
        toast.success('会計連携CSVを作成しました', {
          description: '「作成を依頼したCSV」からダウンロードしてください',
        });
      } else if (running > 0) {
        toast.info('CSVを作成中です', {
          description: '作成には最大1時間ほどかかります。完了後にこの画面からダウンロードできます',
        });
      } else if (empty > 0) {
        toast.info(`${formatMonthLabel(targetMonth)}に出力対象の仕訳はありません`);
      }
    },
    onSettled: () => {
      submittingRef.current = false;
    },
  });

  const keptIds = keptExports.map((item) => item.exportId);
  const keptRows = useExportRows(keptIds, keptIds.length > 0 && !exportMutation.isPending);

  const selectedItems = JOURNAL_ITEMS.filter((item) => selectedKeys.has(item.key));
  const allSelected = selectedItems.length === JOURNAL_ITEMS.length;

  function toggleItem(key: string) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleExport() {
    if (selectedItems.length === 0 || submittingRef.current) return;
    submittingRef.current = true;
    exportMutation.mutate({
      targetMonth,
      journalTypes: selectedItems.flatMap((item) => item.journalTypes),
      packaging,
      storeIds,
    });
  }

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink label="売上管理に戻る" onClick={() => router.push(backToListHref)} />}
        title="会計連携CSV出力"
      />
      <div className="bg-background flex-1 px-6 py-4">
        <div className="mx-auto flex max-w-[720px] flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">対象月・対象店舗選択</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">対象月</Label>
                  {/* FR-008 #305: the previous month is the only month that can be exported */}
                  <MonthPicker
                    value={toPickerValue(targetMonth)}
                    onChange={() => undefined}
                    isMonthEnabled={(year, month) =>
                      `${year}-${String(month).padStart(2, '0')}` === targetMonth
                    }
                  />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label className="text-xs">対象店舗</Label>
                  {/* Own wrapper: the open popover inserts focus-guard spans beside the trigger,
                      which would otherwise pick up space-y margin and shift the row */}
                  <div>
                    <StoreSelectInput
                      value={showStoreFilter ? targetStoreId : (effectiveStoreId ?? null)}
                      valueLabel={
                        showStoreFilter
                          ? undefined
                          : (restrictedHeaderStore?.name ?? headerStoreLabel)
                      }
                      onChange={(store) => setTargetStoreId(store?.id ?? null)}
                      disabled={!showStoreFilter}
                      triggerClassName="w-56 max-w-full justify-between font-normal"
                    />
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                ※ 前月分の確定済みデータのみ出力可能です。
              </p>
              {unconfirmedCount > 0 && (
                <Alert className="border-warning/50 bg-warning/15">
                  <AlertTriangle className="text-warning size-4" />
                  <AlertTitle className="text-sm">未確定データが混在しています</AlertTitle>
                  <AlertDescription className="text-muted-foreground text-xs">
                    {formatMonthLabel(targetMonth)}に未確定データが{unconfirmedCount}
                    件含まれています。確定済みデータのみで出力します。
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">仕訳種別選択</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() =>
                  setSelectedKeys(
                    allSelected ? new Set() : new Set(JOURNAL_ITEMS.map((item) => item.key)),
                  )
                }
              >
                {allSelected ? 'すべて解除' : 'すべて選択'}
              </Button>
            </CardHeader>
            <CardContent>
              {JOURNAL_ITEMS.map((item, index) => (
                <div key={item.key}>
                  {index > 0 && <Separator />}
                  <div className="flex items-center gap-3 py-3">
                    <Checkbox
                      id={`journal-${item.key}`}
                      checked={selectedKeys.has(item.key)}
                      onCheckedChange={() => toggleItem(item.key)}
                    />
                    <div>
                      <Label
                        htmlFor={`journal-${item.key}`}
                        className="cursor-pointer text-sm font-medium"
                      >
                        {item.label}
                      </Label>
                      <p className="text-muted-foreground text-xs">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">出力設定</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={packaging}
                onValueChange={(value) => setPackaging(value as Packaging)}
                className="space-y-3"
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="individual" id="format-individual" className="mt-0.5" />
                  <div>
                    <Label htmlFor="format-individual" className="cursor-pointer text-sm">
                      個別CSVファイル（仕訳種別ごと）
                    </Label>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      選択した仕訳種別ごとに個別のCSVファイルを出力します。売上は月額売上と入会金の2ファイルです。
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="bundled" id="format-bundled" className="mt-0.5" />
                  <div>
                    <Label htmlFor="format-bundled" className="cursor-pointer text-sm">
                      一括CSVファイル（全仕訳統合）
                    </Label>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      選択した仕訳種別をすべて1つのCSVファイルに統合して出力します。
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {keptExports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">作成を依頼したCSV</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2 text-xs">
                  作成には最大1時間ほどかかります。完了したものからダウンロードできます。
                </p>
                <ul className="space-y-1.5">
                  {keptExports.map((item) => (
                    <KeptExportRow
                      key={item.exportId}
                      item={item}
                      row={keptRows?.find((row) => row.exportId === item.exportId)}
                      isLoaded={keptRows !== undefined}
                      isDownloading={
                        downloadMutation.isPending && downloadMutation.variables === item.exportId
                      }
                      onDownload={() => downloadMutation.mutate(item.exportId)}
                      onDismiss={() => forgetExport(item.exportId)}
                    />
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <Button
              size="lg"
              variant="outline"
              disabled={exportMutation.isPending}
              onClick={() => router.push(backToListHref)}
            >
              キャンセル
            </Button>
            <RoleGatedButton
              size="lg"
              requiredPermission={Permission.SalesExport}
              denyTooltip="会計CSVを出力する権限がありません"
              className="gap-2"
              disabled={selectedItems.length === 0 || exportMutation.isPending || isScopeLoading}
              onClick={handleExport}
            >
              <Download className="size-4" />
              {exportMutation.isPending ? 'CSV作成中...' : 'CSV出力'}
            </RoleGatedButton>
          </div>
        </div>
      </div>
    </>
  );
}

interface KeptExportRowProps {
  item: KeptExport;
  row: AccountingExportListItemDto | undefined;
  /** The list answered — a kept id it does not return is gone (other account, deleted) */
  isLoaded: boolean;
  isDownloading: boolean;
  onDownload: () => void;
  onDismiss: () => void;
}

function getSettledLabel(row: AccountingExportListItemDto | undefined): string {
  if (!row) return '見つかりません';
  if (row.status === 'exported') return '対象の仕訳なし';
  return row.status === 'expired' ? '有効期限切れ' : '作成失敗';
}

function KeptExportRow({
  item,
  row,
  isLoaded,
  isDownloading,
  onDownload,
  onDismiss,
}: Readonly<KeptExportRowProps>) {
  const isRunning = row ? isExportRunning(row) : !isLoaded;
  let status: React.ReactNode;
  if (isRunning) {
    status = <span className="text-muted-foreground">作成中</span>;
  } else if (row?.status === 'exported' && row.totalRecords > 0) {
    status = (
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1"
        disabled={isDownloading}
        onClick={onDownload}
      >
        <Download className="size-3.5" />
        ダウンロード
      </Button>
    );
  } else {
    status = (
      <span className="flex items-center gap-2">
        <span className="text-muted-foreground">{getSettledLabel(row)}</span>
        <Button size="sm" variant="ghost" className="h-7" onClick={onDismiss}>
          削除
        </Button>
      </span>
    );
  }
  return (
    <li className="flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0">
        <span>
          {formatMonthLabel(item.exportMonth)}・{EXPORT_TYPE_LABELS[item.exportType]}
          {row && (
            <>
              ・<ExportStoreLabel storeIds={row.scopeStoreIds} />
            </>
          )}
        </span>
        {row?.status === 'exported' && row.totalRecords > 0 && (
          <span className="text-muted-foreground ml-2 tabular-nums">
            {row.totalRecords}件・{formatYen(row.totalAmount)}
          </span>
        )}
        {row && (
          <span className="text-muted-foreground ml-2">依頼 {formatDateTime(row.requestedAt)}</span>
        )}
      </span>
      {status}
    </li>
  );
}

/**
 * The stores a request covers (§9 `scopeStoreIds`, `null` = 全店舗), so requests for different
 * stores can be told apart
 */
function ExportStoreLabel({ storeIds }: Readonly<{ storeIds: string[] | null }>) {
  const { restrictedStores } = useCurrentStore();
  const storeId = storeIds?.length === 1 ? storeIds[0] : undefined;
  const restrictedStore = restrictedStores.find((store) => store.id === storeId);
  const { label } = useStoreLabel(storeId, { enabled: !restrictedStore });
  if (!storeIds || storeIds.length === 0) return '全店舗';
  if (storeIds.length > 1) return `${storeIds.length}店舗`;
  return restrictedStore?.name ?? label ?? '';
}
