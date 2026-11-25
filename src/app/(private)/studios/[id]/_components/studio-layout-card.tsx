import Link from 'next/link';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { StudioDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { type StudioLayoutCell, seatToLayoutCell } from '../../_utils/studio-api.util';

interface StudioLayoutCardProps {
  studio: Pick<StudioDetailDto, 'id' | 'seats' | 'gridSize'>;
}

function LayoutCell({ cell }: Readonly<{ cell: StudioLayoutCell }>) {
  const base = 'size-12 rounded flex items-center justify-center text-xs font-medium border';
  switch (cell.kind) {
    case 'normal_seat':
      return (
        <div className={`${base} bg-success/10 text-success border-success/20`}>
          {cell.seatNumber}
        </div>
      );
    case 'equipment_seat':
      return (
        <div className={`${base} bg-warning/15 text-warning border-warning/20 truncate px-0.5`}>
          {cell.label ?? '器材'}
        </div>
      );
    case 'fixed_object':
      return (
        <div className={`${base} bg-muted text-muted-foreground border-border truncate px-0.5`}>
          {cell.label ?? '固定'}
        </div>
      );
    default:
      return <div className={`${base} bg-background border-dashed`} />;
  }
}

export function StudioLayoutCard({ studio }: StudioLayoutCardProps) {
  const backToListHref = useBackToListHref(navigate('/studios'));
  const withReturnTo = useWithReturnTo();
  const { rows, cols } = studio.gridSize;

  if (studio.seats.length === 0 || rows === 0 || cols === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">スペースレイアウト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-300 py-8">
            <p className="text-muted-foreground mb-4 text-center text-sm">
              レイアウト情報が未設定です
            </p>
            <Link href={withReturnTo(navigate('/studios/[id]/edit', studio.id), backToListHref)}>
              <Button size="sm" variant="outline">
                レイアウトを設定する
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // The API answers every stored cell, empty ones included; rebuild the rows × cols grid keyed by
  // (x, y) anyway so a missing cell still renders as blank. Seat numbers are the stored ones.
  const cellMap = new Map(
    studio.seats.map((seat) => [`${seat.columnIndex},${seat.rowIndex}`, seatToLayoutCell(seat)]),
  );
  const cells: StudioLayoutCell[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push(cellMap.get(`${x},${y}`) ?? { x, y, kind: 'empty' });
    }
  }

  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle className="text-base font-semibold">スペースレイアウト</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div
          className="grid justify-center gap-2"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 3rem))`,
          }}
        >
          {cells.map((cell) => (
            <LayoutCell key={`${cell.x}-${cell.y}`} cell={cell} />
          ))}
        </div>
      </CardContent>
      <div className="bg-muted/50 text-muted-foreground flex flex-wrap items-center gap-3 rounded-b-xl border-t px-4 py-3 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="bg-success/10 border-success/20 size-3 rounded border" /> 通常席
        </div>
        <div className="flex items-center gap-1">
          <div className="bg-warning/15 border-warning/20 size-3 rounded border" /> 器材席
        </div>
        <div className="flex items-center gap-1">
          <div className="bg-muted border-border size-3 rounded border" /> 固定物
        </div>
      </div>
    </Card>
  );
}
