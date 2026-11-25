import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { buildMonthColumns } from './leaves-monthly-view';

const SKELETON_ROW_COUNT = 8;

/** Grid-shaped placeholder for the 月別ビュー first load: same header, skeleton member and month cells. */
export function LeavesMonthlySkeleton() {
  const monthColumns = buildMonthColumns();

  return (
    <div className="overflow-x-auto border-t">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-100 text-xs font-semibold first:pl-4">会員</TableHead>
            {monthColumns.map((month) => (
              <TableHead
                key={month}
                className="min-w-20 border-l text-center text-xs font-semibold"
              >
                {month}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="first:pl-4">
                <Skeleton className="h-4 w-full" />
              </TableCell>
              {monthColumns.map((month) => (
                <TableCell key={month} className="border-l">
                  <Skeleton className="mx-auto h-4 w-12" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
