'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { LockerContractDetailDto } from '@/lib/api-real/types.gen';

type LockerContractMemberSectionProps = {
  contract: LockerContractDetailDto;
};

/** Contract holder info (display only) — the holder of a contract is never reassigned. */
export function LockerContractMemberSection({ contract }: LockerContractMemberSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">契約者情報</CardTitle>
      </CardHeader>
      <CardContent className="px-6">
        <div className="bg-muted/50 rounded-lg border px-4 py-3">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <p className="text-muted-foreground text-xs">会員番号</p>
              <p className="text-sm font-medium">{contract.memberNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">氏名</p>
              <p className="text-sm font-medium">{contract.memberName ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">電話番号</p>
              <p className="text-sm">{contract.memberPhoneNumber || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">メール</p>
              <p className="text-sm">{contract.memberEmail || '—'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
