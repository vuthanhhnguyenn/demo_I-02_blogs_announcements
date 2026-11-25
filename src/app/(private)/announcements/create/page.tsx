'use client';
// Client component: the form's defaults depend on the signed-in user's role (auth context), and
// the form itself is react-hook-form driven.
import { Suspense } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';

import { navigate } from '@/lib/routes/routes.util';

import { AnnouncementForm, AnnouncementFormSkeleton } from '../_components/announcement-form';
import {
  ANNOUNCEMENT_FORM_BACK_LABEL,
  ANNOUNCEMENT_FORM_CREATE_TITLE,
  ANNOUNCEMENT_WIDE_SCOPE_ROLES,
} from '../_constants/announcement-form.constants';
import {
  type AnnouncementFormValues,
  emptyAnnouncementFormValues,
} from '../_schemas/announcement-form.schema';

const PAGE_TITLE = ANNOUNCEMENT_FORM_CREATE_TITLE;

function AnnouncementCreatePageContent() {
  const { user, isLoading, hasRole } = useAuthUser();

  // The scope default needs the role, and useForm reads its defaults only once.
  if (isLoading || !user) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PageHeader
          breadcrumb={
            <BackToListLink
              label={ANNOUNCEMENT_FORM_BACK_LABEL}
              listPath={navigate('/announcements')}
            />
          }
          title={PAGE_TITLE}
        />
        <AnnouncementFormSkeleton />
      </div>
    );
  }

  // US1-AC1: ブランド指定 for Manager and above (prototype L130), 店舗指定 for Staff (inherited Q1).
  const defaultValues: AnnouncementFormValues = {
    ...emptyAnnouncementFormValues,
    scope: hasRole(ANNOUNCEMENT_WIDE_SCOPE_ROLES) ? 'brand' : 'store',
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AnnouncementForm mode="create" title={PAGE_TITLE} defaultValues={defaultValues} />
    </div>
  );
}

export default function AnnouncementCreatePage() {
  return (
    <Suspense fallback={<Loading />}>
      <AnnouncementCreatePageContent />
    </Suspense>
  );
}
