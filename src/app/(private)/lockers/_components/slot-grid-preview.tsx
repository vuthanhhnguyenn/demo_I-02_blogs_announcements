import { Grid3X3 } from 'lucide-react';

import {
  LOCKER_SHAPE_GRID,
  type LockerOrderType,
  type LockerShapeType,
} from '../_constants/locker-enum-labels.constants';
import { buildLockerSlotPositions, formatSlotId } from '../_utils/locker-slot-numbering.util';

type SlotGridPreviewProps = {
  shapeType: LockerShapeType;
  /** `locationCode` (「A」) */
  prefix: string;
  startNum: number;
  orderType: LockerOrderType;
};

/** The slot codes the API will create (API-100 §6.1 ORDER_TYPE_ITERATOR), laid out top row first */
export function SlotGridPreview({ shapeType, prefix, startNum, orderType }: SlotGridPreviewProps) {
  const dimensions = LOCKER_SHAPE_GRID[shapeType];
  if (!dimensions || !prefix) return null;

  const { rows, cols } = dimensions;
  const positions = buildLockerSlotPositions(prefix, shapeType, orderType, startNum);

  const gridRows = Array.from({ length: rows }, (_, rowIndex) => {
    const cells = positions
      .filter((position) => position.rowIndex === rowIndex)
      .sort((a, b) => a.columnIndex - b.columnIndex);
    return (
      <div key={rowIndex} className="flex items-center gap-2">
        {/* 段 is counted from the bottom */}
        <div className="text-muted-foreground w-16 shrink-0 pr-2 text-right text-[10px] font-medium">
          {rows - rowIndex}段目
        </div>
        {cells.map((cell) => (
          <div
            key={cell.slotLabel}
            className="bg-background text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded border text-[9px] font-medium"
            title={cell.slotLabel}
          >
            {cell.slotCode}
          </div>
        ))}
      </div>
    );
  });

  const totalSlots = rows * cols;
  const lastNum = startNum + totalSlots - 1;

  return (
    <div className="bg-muted/30 mt-4 rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-2">
        <Grid3X3 className="text-muted-foreground size-4" />
        <p className="text-muted-foreground text-xs font-semibold">スロット配置プレビュー</p>
        <span className="text-muted-foreground ml-auto text-xs">
          {formatSlotId(prefix, startNum)} 〜 {formatSlotId(prefix, lastNum)}（{totalSlots}
          スロット）
        </span>
      </div>
      <div className="mb-2 ml-[72px] flex gap-2">
        {Array.from({ length: cols }, (_, index) => (
          <div
            key={index}
            className="text-muted-foreground flex size-10 shrink-0 items-center justify-center text-[9px] font-medium"
          >
            {index + 1}列
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">{gridRows}</div>
    </div>
  );
}
