import { User } from 'lucide-react';

import { Label } from '@/components/ui/label';

interface TargetMemberBlockProps {
  name: string;
  memberNumber: string;
}

/** Read-only identification of the member being acted on (header FR-011). */
export function TargetMemberBlock({ name, memberNumber }: Readonly<TargetMemberBlockProps>) {
  return (
    <div className="flex flex-col gap-2 pt-4">
      <Label className="text-sm font-medium">対象会員</Label>
      <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2">
        <User className="text-muted-foreground size-4 shrink-0" />
        <span className="min-w-0 text-sm font-medium wrap-anywhere">{name || '—'}</span>
        <span className="text-muted-foreground shrink-0 text-xs">{memberNumber}</span>
      </div>
    </div>
  );
}
