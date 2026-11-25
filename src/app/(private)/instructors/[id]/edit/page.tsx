'use client';

import { useParams } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useQuery } from '@tanstack/react-query';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';

import { adminTrainerControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { UserRole } from '@/types/permission.type';

import { InstructorForm } from '../../_components/instructor-form/instructor-form';
import { InstructorFormSkeleton } from '../../_components/instructor-form/instructor-form-skeleton';
import { INSTRUCTOR_ERROR_CODE } from '../../_utils/instructor-api.util';

export default function InstructorEditPage() {
  const params = useParams();
  const instructorId = params.id as string;
  const { user } = useAuthUser();

  const {
    data: instructor,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminTrainerControllerDetailOptions({ path: { trainerId: instructorId } }),
    enabled: Boolean(instructorId),
  });
  const isNotFound = error?.code === INSTRUCTOR_ERROR_CODE.notFound || error?.code === 'E-VAL-001';

  if (!instructor) {
    return (
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError && !isNotFound}
        isEmpty={isNotFound || !instructor}
        onRetry={() => void refetch()}
        emptyTitle="指導者が見つかりません"
        emptyDescription={`指定された指導者ID（${instructorId}）は存在しないか、参照権限がありません。`}
        skeleton={<InstructorFormSkeleton />}
      />
    );
  }

  // D13: the API says what this caller may change; none → no edit at all
  if (instructor.editableFields.length === 0) {
    return (
      <DataStateBoundary
        isLoading={false}
        isEmpty
        emptyTitle="編集権限がありません"
        emptyDescription="この指導者プロフィールを編集する権限がありません。"
      />
    );
  }

  // A trainer edits only their own profile, through PATCH /trainers/me
  const selfEdit = user?.role === UserRole.Trainer;

  return (
    <div className="flex flex-col">
      <PageHeader
        breadcrumb={<BackToListLink label="指導者管理に戻る" listPath={navigate('/instructors')} />}
        title="指導者編集"
      />
      <InstructorForm mode="edit" instructor={instructor} selfEdit={selfEdit} />
    </div>
  );
}
