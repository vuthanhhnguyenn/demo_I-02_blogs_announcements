import { Badge } from '@/components/ui/badge';

/** Y-14 FR-S001: 一覧・詳細に共通の状態Badge（有効 / 無効） */
export function DomainStatusBadge({ isActive }: Readonly<{ isActive: boolean }>) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? 'bg-success/15 text-success border-success/20 gap-1 text-[10px] font-medium'
          : 'bg-muted text-muted-foreground border-border gap-1 text-[10px] font-medium'
      }
    >
      <span
        className={`size-1.5 rounded-full ${isActive ? 'bg-success' : 'bg-muted-foreground'}`}
      />
      {isActive ? '有効' : '無効'}
    </Badge>
  );
}
