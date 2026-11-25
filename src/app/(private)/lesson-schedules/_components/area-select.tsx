'use client';

import { MapPin } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { OrganizationNodeItemDto } from '@/lib/api-real/types.gen';

interface AreaSelectProps {
  /** Active Y-15 `area` nodes (GET /admin/organization-nodes?nodeType=area&isActive=true) */
  areas: OrganizationNodeItemDto[];
  value: string | null;
  onChange: (areaId: string) => void;
  disabled?: boolean;
}

/** Picks the area the all-store summary aggregates (GET /lesson-schedules/area-dashboard). */
export function AreaSelect({
  areas,
  value,
  onChange,
  disabled = false,
}: Readonly<AreaSelectProps>) {
  const selected = areas.find((a) => a.id === value);

  return (
    <div className="flex shrink-0 items-center gap-2">
      <MapPin className="text-muted-foreground size-4" />
      <Select
        value={value ?? ''}
        onValueChange={(v) => v && onChange(v)}
        disabled={disabled || areas.length === 0}
      >
        <SelectTrigger className="h-8 w-[220px] text-xs">
          <SelectValue>
            {selected
              ? `エリア: ${selected.name}`
              : areas.length === 0
                ? 'エリアが登録されていません'
                : 'エリアを選択'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {areas.map((area) => (
            <SelectItem key={area.id} value={area.id}>
              {area.parentName ? `${area.parentName} / ${area.name}` : area.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
