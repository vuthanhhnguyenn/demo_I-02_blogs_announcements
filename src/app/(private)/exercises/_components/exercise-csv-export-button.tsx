'use client';

import { useRef } from 'react';

import { downloadCsv, getCsvFilenameFromContentDisposition } from '@/utils/csv.util';
import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { RoleGatedButton } from '@/components/common/role-gated-button';

import { AdminExerciseMasterApi079 } from '@/lib/api-real';
import type { AdminExerciseMasterControllerExportCsvData } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

type ExportQuery = NonNullable<AdminExerciseMasterControllerExportCsvData['query']>;
type CsvDownload = { blob: Blob; filename: string };

type ExerciseCsvExportButtonProps = {
  /** FR-016 (D20): the list's current filters and sort, without paging. */
  query: ExportQuery;
};

export function ExerciseCsvExportButton({ query }: ExerciseCsvExportButtonProps) {
  // `disabled={isPending}` lands a render later; the ref drops rapid repeat clicks before that.
  const inFlightRef = useRef(false);
  const { mutate, isPending } = useMutation({
    mutationFn: async (): Promise<CsvDownload> => {
      const { data, response } =
        await AdminExerciseMasterApi079.adminExerciseMasterControllerExportCsv({
          query,
          parseAs: 'blob',
          throwOnError: true,
        });

      // The BE writes the complete file: UTF-8 BOM, CRLF, display names (BE_REQUEST No.6).
      return {
        blob: data as unknown as Blob,
        filename: getCsvFilenameFromContentDisposition(
          response.headers.get('content-disposition'),
          'exercises.csv',
        ),
      };
    },
    onSuccess: ({ blob, filename }) => {
      downloadCsv(blob, filename);
      toast.success('エクササイズのCSVをダウンロードしました');
    },
    onSettled: () => {
      inFlightRef.current = false;
    },
  });

  return (
    <RoleGatedButton
      requiredPermission={Permission.ExercisesView}
      variant="outline"
      className="gap-1"
      denyTooltip="CSV出力の権限がありません"
      disabled={isPending}
      onClick={() => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        mutate();
      }}
    >
      <Download className="size-4" />
      CSV出力
    </RoleGatedButton>
  );
}
