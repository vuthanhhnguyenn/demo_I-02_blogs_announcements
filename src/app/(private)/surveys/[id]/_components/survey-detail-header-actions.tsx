'use client';

import { useRouter } from 'next/navigation';

import { BarChart3, Eye, FileText, Pencil } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { RoleGatedButton } from '@/components/common/role-gated-button';

import { navigate } from '@/lib/routes/routes.util';

import { Permission, UserRole } from '@/types/permission.type';

interface SurveyDetailHeaderActionsProps {
  surveyId: string;
  category: string;
}

export function SurveyDetailHeaderActions({ surveyId, category }: SurveyDetailHeaderActionsProps) {
  const router = useRouter();
  const backToListHref = useBackToListHref(navigate('/surveys'));
  const withReturnTo = useWithReturnTo();
  // Same gating as the list row 編集: lifecycle → Headquarter/System only (G-04 L165),
  // operational → the position flag.
  const isOperational = category === 'operational';

  return (
    <div className="flex items-center gap-2">
      <RoleGatedButton
        allowedRoles={[UserRole.Headquarter, UserRole.System, UserRole.Manager, UserRole.Staff]}
        type="button"
        variant="outline"
        className="gap-1"
        onClick={() =>
          router.push(
            withReturnTo(navigate('/surveys/responses', { survey_id: surveyId }), backToListHref),
          )
        }
      >
        <FileText className="size-4" />
        回答データ
      </RoleGatedButton>
      <RoleGatedButton
        allowedRoles={[UserRole.Headquarter, UserRole.System, UserRole.Manager, UserRole.Staff]}
        type="button"
        variant="outline"
        className="gap-1"
        onClick={() =>
          router.push(
            withReturnTo(navigate('/surveys/analytics', { survey_id: surveyId }), backToListHref),
          )
        }
      >
        <BarChart3 className="size-4" />
        集計分析
      </RoleGatedButton>
      <RoleGatedButton
        allowedRoles={[UserRole.Headquarter, UserRole.System, UserRole.Manager, UserRole.Staff]}
        denyTooltip="店舗別表示設定は本部・マネージャー・スタッフが操作できます"
        type="button"
        variant="outline"
        className="gap-1"
        onClick={() =>
          router.push(withReturnTo(navigate('/surveys/[id]/visibility', surveyId), backToListHref))
        }
      >
        <Eye className="size-4" />
        店舗別表示設定
      </RoleGatedButton>
      <RoleGatedButton
        allowedRoles={isOperational ? undefined : [UserRole.Headquarter, UserRole.System]}
        requiredPermission={isOperational ? Permission.SurveysEdit : undefined}
        className="gap-1"
        onClick={() =>
          router.push(withReturnTo(navigate('/surveys/[id]/edit', surveyId), backToListHref))
        }
      >
        <Pencil className="size-4" />
        編集
      </RoleGatedButton>
    </div>
  );
}
