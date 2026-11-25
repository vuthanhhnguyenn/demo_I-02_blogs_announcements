'use client';

import { useState } from 'react';

import { formatDateYYYYMM } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminMemberContractOpsControllerListCampaignApplicationsOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { MemberCampaignApplicationDto } from '@/lib/api-real/types.gen';

type CampaignFilter = 'all' | 'active' | 'ended';

const CAMPAIGN_FILTER_OPTIONS: { value: CampaignFilter; label: string }[] = [
  { value: 'all', label: '全期間' },
  { value: 'active', label: '適用中のみ' },
  { value: 'ended', label: '終了済みのみ' },
];

type CampaignRow = MemberCampaignApplicationDto & { isActive: boolean };

const STATUS_BADGE_CLASSES: Record<string, string> = {
  適用中: 'border-success/20 bg-success/15 text-success text-[10px]',
  終了: 'text-muted-foreground border-muted-foreground/20 bg-muted/50 text-[10px]',
};

interface CampaignsCardProps {
  memberId: string;
}

function getPeriodLabel(cp: CampaignRow): string {
  if (!cp.appliedFrom || !cp.appliedTo) return '—';
  const start = formatDateYYYYMM(cp.appliedFrom);
  const end = formatDateYYYYMM(cp.appliedTo);
  return start === end ? start : `${start} 〜 ${end}`;
}

function getStatusLabel(row: CampaignRow): string {
  return row.isActive || row.status === 'active' ? '適用中' : '終了';
}

export function CampaignsCard({ memberId }: CampaignsCardProps) {
  const [filter, setFilter] = useState<CampaignFilter>('all');

  const {
    data: campaigns,
    isLoading,
    isError,
    refetch,
  } = useQuery(
    adminMemberContractOpsControllerListCampaignApplicationsOptions({
      path: { memberId: memberId },
    }),
  );

  // The real response splits the same way but names the halves `current` (one, nullable) and
  // `historical` (array) rather than `active` / `history`.
  const rows: CampaignRow[] = [
    ...(campaigns?.current ? [{ ...campaigns.current, isActive: true }] : []),
    ...(campaigns?.historical ?? []).map((cp) => ({ ...cp, isActive: false })),
  ];

  // Active campaigns first, then by application period descending
  const sortedRows = [...rows].sort((a, b) => {
    const aActive = a.isActive || a.status === 'active';
    const bActive = b.isActive || b.status === 'active';
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return (b.appliedFrom ?? '').localeCompare(a.appliedFrom ?? '');
  });

  const filteredRows = sortedRows.filter((row) => {
    const isActive = row.isActive || row.status === 'active';
    if (filter === 'active') return isActive;
    if (filter === 'ended') return !isActive;
    return true;
  });

  return (
    <Card className="gap-0 py-0">
      {/* The filter Select stays outside the boundary so it remains usable on fetch errors */}
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">キャンペーン適用</CardTitle>
          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as CampaignFilter)}
            items={CAMPAIGN_FILTER_OPTIONS}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {CAMPAIGN_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={!campaigns}
        onRetry={() => refetch()}
        errorTitle="キャンペーン適用状況の取得に失敗しました"
        skeleton={
          <div className="space-y-3 px-4 pb-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`campaign-row-${index}`} className="h-9 w-full" />
            ))}
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">キャンペーン名</TableHead>
              <TableHead className="text-xs font-semibold">特典内容</TableHead>
              <TableHead className="text-xs font-semibold">適用期間</TableHead>
              <TableHead className="text-xs font-semibold">ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length > 0 ? (
              filteredRows.map((cp) => {
                const label = getStatusLabel(cp);
                return (
                  <TableRow key={cp.campaignApplicationId}>
                    <TableCell className="text-sm font-medium">
                      <span className="block max-w-40 truncate" title={cp.campaignName}>
                        {cp.campaignName}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span
                        className="block max-w-32 truncate"
                        title={cp.discountSummary ?? undefined}
                      >
                        {cp.discountSummary ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{getPeriodLabel(cp)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_BADGE_CLASSES[label]}>
                        {label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-6 text-center text-sm">
                  該当するキャンペーンはありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataStateBoundary>
    </Card>
  );
}
