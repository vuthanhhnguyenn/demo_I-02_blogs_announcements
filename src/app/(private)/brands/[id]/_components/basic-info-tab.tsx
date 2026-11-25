import { formatDateYYYYMMDD_HHMMSS } from '@/utils/date.util';
import { Pencil } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { BrandDetailDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

const EMPTY_VALUE = '—';

interface BasicInfoTabProps {
  brand: BrandDetailDto;
  onEditBrand: () => void;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      <p className="text-sm wrap-break-word">{value}</p>
    </div>
  );
}

/**
 * Prototype 9/30: Y-07 lists only ブランドID / ブランド名 and defines no brand status, so the old
 * StatusCard + 有効 badge are gone; the right column is a その他情報 card with the brand-level
 * timestamps (`BrandDetailDto`, plan B4). `updatedAt` moves only on a rename — fee edits live on
 * their own rows and in 変更履歴.
 */
export function BasicInfoTab({ brand, onEditBrand }: BasicInfoTabProps) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      <div className="xl:w-[60%]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold">一般情報</CardTitle>
              {/* Y-07 FR-001「本部のみが編集可能」— the same sheet as the list row's 編集. */}
              <RoleGatedButton
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                requiredPermission={Permission.BrandsEdit}
                denyTooltip="本部権限が必要です"
                onClick={onEditBrand}
              >
                <Pencil className="size-3" />
                変更
              </RoleGatedButton>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground mb-1 text-xs">ブランドID</p>
                <p className="font-mono text-sm">{brand.brandGroup}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-xs">ブランド名</p>
                <p className="text-sm font-medium wrap-break-word">{brand.displayName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="xl:w-[40%]">
        <div className="sticky top-0 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">その他情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <InfoRow
                  label="作成日時"
                  value={formatDateYYYYMMDD_HHMMSS(brand.createdAt ?? '', EMPTY_VALUE)}
                />
                {/*
                  TODO(round3) G2 — `BrandDetailDto` has no `createdBy` / `createdByName` at the
                  brand level (only `updatedBy*`). BE ask raised; 「—」 until it lands.
                */}
                <InfoRow label="作成者" value={EMPTY_VALUE} />
                <InfoRow
                  label="更新日時"
                  value={formatDateYYYYMMDD_HHMMSS(brand.updatedAt ?? '', EMPTY_VALUE)}
                />
                <InfoRow label="更新者" value={brand.updatedByName ?? EMPTY_VALUE} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
