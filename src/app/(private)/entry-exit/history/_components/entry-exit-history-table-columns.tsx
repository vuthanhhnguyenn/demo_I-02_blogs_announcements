'use client';

import { formatDateMMDD, formatTime } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { AccessLogEntryDto } from '@/lib/api-real/types.gen';

import { DeniedBadge } from '../../_components/entry-exit-badges';

export type HistoryVisitRow = AccessLogEntryDto;

const AUTH_CHANNEL_LABELS: Record<NonNullable<HistoryVisitRow['authChannel']>, string> = {
  qr: 'QRコード',
  nfc: 'NFCカード',
  face: '顔認証',
  manual: '手動',
};

const SEX_LABELS: Record<string, string> = { male: '男性', female: '女性' };

// FR-M003–M009: every 拒否 badge carries its reason label (decided 2026-10-21; wording drafted from
// B-01 FR-M004–M009, PO to confirm — the CSV's 拒否理由詳細 uses the same words). An unlabelled
// `denied_*` reads as その他, never as its code.
const DENIAL_REASON_LABELS: Record<Exclude<HistoryVisitRow['result'], 'allowed'>, string> = {
  denied_blacklist: 'ブラックリスト',
  denied_delinquent: '未納金あり',
  denied_family_in: '家族会員利用中',
  denied_manual_stop: '手動ゲートストップ',
  denied_contract: '主契約無効',
  denied_option: 'オプション契約無効',
  denied_duplicate: '重複認証',
  denied_auth_failed: '認証失敗',
  denied_companion_no_invite: '同伴招待なし',
  denied_companion_window_expired: '同伴受付時間外',
  denied_other: 'その他',
};

// The two reasons with a known gate terminal message (prototype); the others show the row's own
// `denialReasonDetail` in the tooltip when the gate wrote one, and no tooltip otherwise.
const DENIAL_REASONS = {
  suspended: { label: '休会中', gateMessage: '休会中のためご利用いただけません' },
  contractInvalid: { label: '主契約無効', gateMessage: 'ご利用できません' },
} as const;

function getDenialReason(row: HistoryVisitRow): { label: string; gateMessage: string | null } {
  if (row.denialReasonDetail === 'suspended') return DENIAL_REASONS.suspended;
  if (row.result === 'denied_contract') return DENIAL_REASONS.contractInvalid;
  const label = DENIAL_REASON_LABELS[row.result as keyof typeof DENIAL_REASON_LABELS] ?? 'その他';
  return { label, gateMessage: row.denialReasonDetail || null };
}

/** 在館時間 in `H:MM` (e.g. `1:27`). */
function formatDwellTime(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/** FR-010: rows without a paired exit (in-progress / denied) never show an exit time or stay duration. */
function ExitTimeCell({ row }: { row: HistoryVisitRow }) {
  return <span className="text-xs">{formatTime(row.exitAt)}</span>;
}

function StayDurationCell({ row }: { row: HistoryVisitRow }) {
  return (
    <span className="text-xs">
      {row.dwellTimeSeconds == null ? '—' : formatDwellTime(row.dwellTimeSeconds)}
    </span>
  );
}

function ResultCell({ row }: { row: HistoryVisitRow }) {
  if (row.result === 'allowed') {
    return (
      <Badge variant="outline" className="bg-success/15 text-success border-success/20">
        成功
      </Badge>
    );
  }

  const reason = getDenialReason(row);
  const labelClassName = 'text-xs whitespace-nowrap';

  return (
    <div className="flex items-center gap-1">
      <DeniedBadge />
      {reason.gateMessage ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<span className={`cursor-help ${labelClassName}`} />}>
              {reason.label}
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-60 text-xs leading-relaxed break-words">
              ゲート端末表示: 「{reason.gateMessage}」
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <span className={labelClassName}>{reason.label}</span>
      )}
    </div>
  );
}

/**
 * Long values are capped and ellipsised (full value in `title`) so one long name or store name
 * cannot widen the table and squeeze the other columns; short values keep their natural width.
 */
function StoreNameCell({ name }: { name: string | null | undefined }) {
  return (
    <span className="block max-w-40 truncate text-xs" title={name ?? undefined}>
      {name ?? '—'}
    </span>
  );
}

/** FR-M008: 同伴入館, with the 招待者 tooltip when the API names the inviter (none when `inviter` is null). */
function CompanionEntryBadge({ inviter }: { inviter: HistoryVisitRow['inviter'] }) {
  const badgeClassName = 'bg-info/15 text-info border-info/20';
  if (!inviter) {
    return (
      <Badge variant="outline" className={badgeClassName}>
        同伴入館
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<Badge variant="outline" className={`${badgeClassName} cursor-help`} />}
        >
          同伴入館
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-60 text-xs leading-relaxed">
          招待者: {inviter.name ?? '—'}（会員ID {inviter.publicId ?? '—'}）
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Sorting is server-side (`manualSorting`); each sortable column still needs an accessor,
// otherwise TanStack reports `getCanSort() === false` and the header renders as plain text.
export function entryExitHistoryTableColumns(): ColumnDef<HistoryVisitRow>[] {
  return [
    {
      id: 'name',
      accessorFn: (row) => row.member?.nameKana,
      header: ({ column }) => <DataTableColumnHeader column={column} title="利用者" />,
      cell: ({ row }) => {
        const member = row.original.member;
        const name = member?.name ?? '—';
        return (
          <div className="flex items-center gap-2">
            <Avatar className="size-10">
              <AvatarImage
                src={member?.facePhotoUrl ?? undefined}
                alt={name}
                className="object-cover"
              />
              <AvatarFallback className="text-xs">{name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            {/* Capped + ellipsised like StoreNameCell; the full name / kana is in `title`. */}
            <div className="min-w-0">
              <p className="block max-w-40 truncate text-xs font-medium" title={name}>
                {name}
              </p>
              <p
                className="text-muted-foreground block max-w-40 truncate text-[10px]"
                title={member?.nameKana ?? undefined}
              >
                {member?.nameKana ?? ''}
              </p>
            </div>
          </div>
        );
      },
      meta: { className: 'pl-4' },
    },
    {
      id: 'member_id',
      header: '会員ID',
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.member?.publicId ?? '—'}
        </span>
      ),
    },
    {
      id: 'visit_date',
      accessorFn: (row) => row.eventAt,
      // 日時 starts newest-first; the header's inactive tooltip follows this too.
      sortDescFirst: true,
      header: ({ column }) => <DataTableColumnHeader column={column} title="日時" />,
      cell: ({ row }) => <span className="text-xs">{formatDateMMDD(row.original.eventAt)}</span>,
    },
    {
      id: 'entry_time',
      accessorFn: (row) => row.eventAt,
      header: ({ column }) => <DataTableColumnHeader column={column} title="入館時刻" />,
      cell: ({ row }) => <span className="text-xs">{formatTime(row.original.eventAt)}</span>,
    },
    {
      id: 'exit_time',
      accessorFn: (row) => row.exitAt,
      header: ({ column }) => <DataTableColumnHeader column={column} title="退館時刻" />,
      cell: ({ row }) => <ExitTimeCell row={row.original} />,
    },
    {
      id: 'stay_duration',
      header: '在館時間',
      cell: ({ row }) => <StayDurationCell row={row.original} />,
    },
    {
      id: 'contract_name',
      accessorFn: (row) => row.member?.planName,
      header: ({ column }) => <DataTableColumnHeader column={column} title="種別" />,
      cell: ({ row }) => {
        const planName = row.original.member?.planName ?? '—';
        return (
          <div className="flex flex-col items-start gap-1">
            {/* `w-max` keeps a long plan at its full 160px when the table is wider than the card,
                instead of being squeezed to a few characters per line by the auto table layout. */}
            <p className="line-clamp-2 w-max max-w-40 text-xs leading-tight" title={planName}>
              {planName}
            </p>
            {row.original.eventType === 'companion_entry' && (
              <CompanionEntryBadge inviter={row.original.inviter} />
            )}
          </div>
        );
      },
      meta: { className: 'max-w-40 whitespace-normal' },
    },
    {
      id: 'gender',
      header: '性別',
      cell: ({ row }) => {
        const sex = row.original.member?.sex;
        const label = sex ? (SEX_LABELS[sex] ?? 'その他') : '—';
        return <span className="text-xs">{label}</span>;
      },
    },
    {
      id: 'home_store_name',
      accessorFn: (row) => row.primaryStore?.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="所属店舗" />,
      cell: ({ row }) => <StoreNameCell name={row.original.primaryStore?.name} />,
    },
    {
      id: 'visit_store_name',
      accessorFn: (row) => row.eventStore?.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="入館店舗" />,
      cell: ({ row }) => <StoreNameCell name={row.original.eventStore?.name} />,
    },
    {
      id: 'auth_method',
      header: '認証方式',
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.authChannel ? AUTH_CHANNEL_LABELS[row.original.authChannel] : '—'}
        </span>
      ),
    },
    {
      id: 'result',
      header: '処理結果',
      cell: ({ row }) => <ResultCell row={row.original} />,
    },
  ];
}
