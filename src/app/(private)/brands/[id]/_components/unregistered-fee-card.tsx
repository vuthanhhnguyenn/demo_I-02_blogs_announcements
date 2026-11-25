import { Plus } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Permission } from '@/types/permission.type';

import type { BrandFeeGroup } from '../_types/brand-fee.type';
import { CancelPolicyNote } from './cancel-policy-note';

/**
 * A sub-brand whose fee master was deleted (`feeMasterStatus: 'none'`). Same frame as
 * `FeeGroupCard`, but the section is dashed and holds only its heading row and ［＋登録］
 * (Y-07 260928_v3 FR-001: re-registering a deleted master is Phase 1).
 */
export function UnregisteredFeeCard({
  feeGroup,
  onRegister,
}: {
  feeGroup: BrandFeeGroup;
  onRegister: (feeGroup: BrandFeeGroup) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="min-w-0 text-base font-semibold [overflow-wrap:anywhere]">
          {feeGroup.title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4">
          <section
            aria-label={`${feeGroup.title}の費用マスタ`}
            className="rounded-lg border border-dashed p-4"
          >
            <div className="flex min-h-7 items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">費用マスタ</p>
                {/* The 無効 grey — 未登録 is not an error state. */}
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground border-border text-[10px]"
                >
                  未登録
                </Badge>
              </div>
              <RoleGatedButton
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                requiredPermission={Permission.BrandsEdit}
                denyTooltip="費用マスタの登録には本部権限が必要です"
                onClick={() => onRegister(feeGroup)}
              >
                <Plus className="size-3" />
                登録
              </RoleGatedButton>
            </div>
          </section>

          <CancelPolicyNote />
        </div>
      </CardContent>
    </Card>
  );
}
