'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { adminLockerControllerGetSlotOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LockerSlotGridItemDto } from '@/lib/api-real/types.gen';

interface PasswordCellProps {
  slotId: string;
  lockMethod: LockerSlotGridItemDto['lockMethod'];
}

/**
 * FR-009 PIN, read on demand: the list rows carry no `pinCode`, so the reveal fetches
 * `GET /admin/locker-slots/{slotId}` (PIN reads are audited by the gateway access log).
 * A PIN exists for `dial_lock` only (BR-LCK-008).
 */
export function PasswordCell({ slotId, lockMethod }: PasswordCellProps) {
  const [visible, setVisible] = useState(false);
  const { data: slot, isFetching } = useQuery({
    ...adminLockerControllerGetSlotOptions({ path: { slotId } }),
    enabled: visible,
  });

  if (lockMethod !== 'dial_lock') {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const shown = visible ? (isFetching && !slot ? '…' : (slot?.pinCode ?? '—')) : '••••';

  return (
    <div className="flex items-center gap-1">
      <span className="w-12 font-mono text-sm">{shown}</span>
      <Button
        variant="ghost"
        size="sm"
        className="size-6 p-0"
        aria-label={visible ? 'パスワードを隠す' : 'パスワードを表示'}
        onClick={(event) => {
          event.stopPropagation();
          setVisible((current) => !current);
        }}
      >
        {visible ? (
          <EyeOff className="text-muted-foreground size-3" />
        ) : (
          <Eye className="text-muted-foreground size-3" />
        )}
      </Button>
    </div>
  );
}
