'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { useAuthUser } from '@/contexts/auth-user.context';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

import { Permission } from '@/types/permission.type';

import type { StudioFormValues } from '../studio-form.schema';

export function StudioFormStatus() {
  const form = useFormContext<StudioFormValues>();
  const status = useWatch({ control: form.control, name: 'status' });

  const isActive = status === 'active';
  // D-03 matrix: deactivating sits with deleting — HQ / Manager only, the API answers Staff with
  // 403 E-STD-101 (API-110 §1.1, CRM UT D-03 No3).
  const { hasPermission } = useAuthUser();
  const canToggle = hasPermission(Permission.StudiosDelete);

  const toggleStatus = (checked: boolean) => {
    form.setValue('status', checked ? 'active' : 'inactive', { shouldDirty: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">ステータス</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">現在のステータス</p>
            {isActive ? (
              <Badge
                variant="outline"
                className="bg-success/15 text-success border-success/20 w-fit gap-1 text-xs font-medium"
              >
                <span className="bg-success size-1.5 rounded-full" />
                有効
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-muted text-muted-foreground border-muted-foreground/20 w-fit gap-1 text-xs font-medium"
              >
                <span className="bg-muted-foreground size-1.5 rounded-full" />
                無効
              </Badge>
            )}
            <p className="text-muted-foreground text-xs">
              無効にすると新規スケジュール登録時の選択肢に表示されません。
            </p>
            {!canToggle && (
              <p className="text-muted-foreground text-xs">
                ステータスの変更は本部・マネージャーのみ可能です。
              </p>
            )}
          </div>
          <Switch checked={isActive} onCheckedChange={toggleStatus} disabled={!canToggle} />
        </div>
      </CardContent>
    </Card>
  );
}
