'use client';

import { useRef } from 'react';

import { downloadCsv, getCsvFilenameFromContentDisposition } from '@/utils/csv.util';
import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { RoleGatedButton } from '@/components/common/role-gated-button';

import { AdminTransactionLedgerApi116 } from '@/lib/api-real';

import { Permission } from '@/types/permission.type';

import type { TransactionQuery } from '../_utils/transaction-labels.util';

interface TransactionsCsvExportButtonProps {
  /** Same filters as the list, without page / limit / includeTotalAll (E-TXN-004) */
  filters: TransactionQuery;
  total: number;
  filterSummary: string[];
}

export function TransactionsCsvExportButton({
  filters,
  total,
  filterSummary,
}: Readonly<TransactionsCsvExportButtonProps>) {
  const submittingRef = useRef(false);

  const mutation = useMutation({
    mutationFn: async () => {
      // API-116 §5: BOM-prefixed UTF-8 text/csv attachment, same filter contract as the list
      const { data, response } =
        await AdminTransactionLedgerApi116.adminTransactionControllerExport({
          query: filters,
          parseAs: 'blob',
          throwOnError: true,
        });
      downloadCsv(
        data,
        getCsvFilenameFromContentDisposition(
          response.headers.get('content-disposition'),
          `transactions_${filters.fromDate.replaceAll('-', '')}_${filters.toDate.replaceAll('-', '')}.csv`,
        ),
      );
    },
    onSuccess: () => {
      const description =
        filterSummary.length > 0
          ? `検索条件（${filterSummary.join('、')}）を保持したまま ${total} 件を出力しました。`
          : `全 ${total} 件を出力しました。`;
      toast.success('入出金明細CSVをダウンロードしました', { description });
    },
    onSettled: () => {
      submittingRef.current = false;
    },
  });

  return (
    <RoleGatedButton
      requiredPermission={Permission.SalesTransactionsView}
      denyTooltip="CSV出力の権限がありません"
      variant="outline"
      className="gap-1"
      disabled={mutation.isPending}
      onClick={() => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        mutation.mutate();
      }}
    >
      <Download className="size-4" />
      CSV出力
    </RoleGatedButton>
  );
}
