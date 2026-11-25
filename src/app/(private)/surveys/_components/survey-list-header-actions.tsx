'use client';

import { useRouter } from 'next/navigation';

import { BarChart3, FileText, Plus } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';

import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

export function SurveyListHeaderActions() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="gap-1"
        onClick={() => router.push(withReturnTo(navigate('/surveys/responses')))}
      >
        <FileText className="size-4" />
        回答データ
      </Button>
      <Button
        type="button"
        variant="outline"
        className="gap-1"
        onClick={() => router.push(withReturnTo(navigate('/surveys/analytics')))}
      >
        <BarChart3 className="size-4" />
        集計分析
      </Button>
      <RoleGatedButton
        requiredPermission={Permission.SurveysCreate}
        denyTooltip="アンケート作成の権限がありません"
        type="button"
        className="gap-1"
        onClick={() => router.push(withReturnTo(navigate('/surveys/create')))}
      >
        <Plus className="size-4" />
        新規登録
      </RoleGatedButton>
    </>
  );
}
