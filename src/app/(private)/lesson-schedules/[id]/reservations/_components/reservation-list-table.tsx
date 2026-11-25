'use client';

import { useState } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { parseAsInteger, useQueryState } from 'nuqs';
import { toast } from 'sonner';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePagination } from '@/components/common/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  adminLessonBookingControllerAttendMutation,
  adminLessonBookingControllerMarkNoShowMutation,
  adminLessonBookingControllerRevertAttendanceMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  LessonBookingListItemDto,
  LessonBookingListResponseDto,
} from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import {
  type AttendanceStatus,
  BOOKING_LIST_PAGE_SIZE,
} from '../_constants/booking-status.constants';
import { invalidateBookingQueries } from '../_utils/booking-api.util';
import { isOwnSessionScope, scopedManageRoles } from '../_utils/session-scope.util';
import { getReservationListColumns } from './reservation-list-columns';

interface ReservationListTableProps {
  scheduleId: string;
  data: LessonBookingListResponseDto;
  isCancelled: boolean;
  onAddReservation: () => void;
  onCancelReservation: (booking: LessonBookingListItemDto) => void;
}

export function ReservationListTable({
  scheduleId,
  data,
  isCancelled,
  onAddReservation,
  onCancelReservation,
}: ReservationListTableProps) {
  // `history: 'push'` so browser back walks pages instead of leaving the screen (BUG-D01A-10).
  const [, setPage] = useQueryState(
    'page',
    parseAsInteger.withDefault(1).withOptions({ history: 'push' }),
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuthUser();

  const isOwnSession = isOwnSessionScope(user);
  const canManageReservation = hasPermission(Permission.LessonsReservationManage) && isOwnSession;
  const canManageAttendance = hasPermission(Permission.LessonsAttendanceManage) && isOwnSession;

  // Decision D6 — the 出席 dropdown maps onto three API-113 endpoints; errors
  // (409 E-LSB-014 re-mark, 422 E-LSB-013 not yet started / not reserved) surface via the
  // shared MutationCache toast.
  const onAttendanceSuccess = () => {
    toast.success('出席状況を更新しました');
    invalidateBookingQueries(queryClient, scheduleId);
  };
  const attendMutation = useMutation({
    ...adminLessonBookingControllerAttendMutation(),
    onSuccess: onAttendanceSuccess,
  });
  const noShowMutation = useMutation({
    ...adminLessonBookingControllerMarkNoShowMutation(),
    onSuccess: onAttendanceSuccess,
  });
  const revertMutation = useMutation({
    ...adminLessonBookingControllerRevertAttendanceMutation(),
    onSuccess: onAttendanceSuccess,
  });

  const handleAttendanceChange = (bookingId: string, status: AttendanceStatus) => {
    const path = { bookingId };
    switch (status) {
      case 'attended':
        attendMutation.mutate({ path, body: { attendedVia: 'manual' } });
        return;
      case 'no_show':
        noShowMutation.mutate({ path });
        return;
      default:
        revertMutation.mutate({ path });
    }
  };

  const columns = getReservationListColumns({
    onAttendanceChange: handleAttendanceChange,
    onCancelReservation,
    canManageReservation,
    canManageAttendance,
    isCancelled,
    page: data.pagination.page,
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data.items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: data.pagination.totalPages,
  });

  return (
    <Card className="pb-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">予約者一覧</CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {data.pagination.totalItems}件
            </Badge>
          </div>
          <RoleGatedButton
            requiredPermission={Permission.LessonsReservationManage}
            allowedRoles={scopedManageRoles(isOwnSession)}
            size="sm"
            className="h-8 text-xs"
            disabled={isCancelled}
            tooltip={isCancelled ? 'このレッスンは中止されています' : undefined}
            onClick={onAddReservation}
          >
            <Plus className="mr-1 size-3" />
            予約を追加
          </RoleGatedButton>
        </div>
      </CardHeader>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/50">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-xs font-semibold">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <Empty
                  variant="empty"
                  title="予約者はいません"
                  description="このレッスンにはまだ予約がありません"
                  action={
                    !isCancelled && (
                      <RoleGatedButton
                        requiredPermission={Permission.LessonsReservationManage}
                        allowedRoles={scopedManageRoles(isOwnSession)}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={onAddReservation}
                      >
                        <Plus className="mr-1 size-3" />
                        予約を追加
                      </RoleGatedButton>
                    )
                  }
                />
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={`hover:bg-accent/50 ${row.original.hasActivePenalty ? 'bg-destructive/10' : ''}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {data.pagination.totalPages > 1 && (
        <TablePagination
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.totalItems}
          limit={BOOKING_LIST_PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </Card>
  );
}
