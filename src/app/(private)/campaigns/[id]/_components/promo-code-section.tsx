'use client';

import { format } from 'date-fns';
import { toast } from 'sonner';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Card } from '@/components/ui/card';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import { AdminPromotionCodesApi089 } from '@/lib/api-real';

import { usePromoCodesTab } from '../_hooks/use-promo-codes-tab';
import type { PromoCodeCampaignRef } from '../_utils/promo-code-campaign-ref';
import { PromoCodeCreateDialog } from './promo-code-create-dialog';
import { PromoCodeDisableDialog } from './promo-code-disable-dialog';
import { PromoCodeEditDialog } from './promo-code-edit-dialog';
import { PromoCodeSearchFilters } from './promo-code-search-filters';
import { PromoCodeTable } from './promo-code-table';
import { PromoCodeUsageSummary } from './promo-code-usage-summary';

const DATE_FORMAT = 'yyyy-MM-dd';
const LIST_ERROR_TITLE = 'プロモーションコードの取得に失敗しました';

export function PromoCodeSection({ campaign }: Readonly<{ campaign: PromoCodeCampaignRef }>) {
  const tab = usePromoCodesTab(campaign);

  // Same as the member list: a request the conditions made invalid (400/422) is not fixed by
  // resending it, so the way out is clearing them; a refused one (403) has none on this screen.
  // Only the other failures (network, 5xx) offer 再試行 with the same conditions — both in the
  // empty state and in the table's stale-data row when a refetch fails with rows still shown.
  const errorStatus = getApiErrorStatus(tab.error);
  const isConditionError = errorStatus === 400 || errorStatus === 422;
  const retry = errorStatus === 403 || isConditionError ? undefined : () => void tab.refetch();
  const errorAction: { onAction?: () => void; actionLabel?: string } = isConditionError
    ? { onAction: tab.clearFilters, actionLabel: '条件をクリア' }
    : retry
      ? { onAction: retry, actionLabel: '再試行' }
      : {};

  const handleExport = async () => {
    const today = format(new Date(), DATE_FORMAT);
    try {
      const { data } = await AdminPromotionCodesApi089.adminPromotionCodeControllerExportCsv({
        query: { campaignId: campaign.id, encoding: 'sjis-bom' },
        parseAs: 'blob',
        throwOnError: true,
      });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `promotion-codes_${today}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('CSVを出力しました');
    } catch {
      toast.error('CSVの出力に失敗しました');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-3 px-4 py-3">
          <PromoCodeSearchFilters tab={tab} onExport={handleExport} />
        </div>

        <PromoCodeTable
          tab={tab}
          errorTitle={LIST_ERROR_TITLE}
          onRetry={retry}
          emptyContent={
            tab.isError ? (
              <Empty
                title={LIST_ERROR_TITLE}
                description={resolveApiErrorMessage(tab.error)}
                {...errorAction}
              />
            ) : (
              <Empty
                variant={tab.hasActiveFilters ? 'filtered' : 'empty'}
                entityLabel="プロモーションコード"
                onAction={tab.hasActiveFilters ? tab.clearFilters : undefined}
              />
            )
          }
        />

        {/* A failed refetch keeps the last rows (and their total), so paging stays usable with them. */}
        {tab.filteredCount > 0 && (
          <TablePaginationWithSize
            currentPage={tab.currentPage}
            total={tab.filteredCount}
            pageSize={tab.pageSize}
            onPageChange={tab.setCurrentPage}
            onPageSizeChange={tab.setPageSize}
          />
        )}

        <PromoCodeUsageSummary issuedCount={tab.totalCount} />
      </Card>

      <PromoCodeCreateDialog campaign={campaign} tab={tab} />
      <PromoCodeDisableDialog tab={tab} />
      <PromoCodeEditDialog tab={tab} />
    </div>
  );
}
