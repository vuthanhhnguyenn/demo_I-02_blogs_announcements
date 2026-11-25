import { NextRequest, NextResponse } from 'next/server';

import { getAuthUserFromRequest, toUserRole } from '@/app/api/_lib/auth';
import { MANUAL_NOTIFICATION_FORM_CONFIG_SEED } from '@/app/api/_mock-db/seeds/manual-notification.seed';
import {
  GetManualNotificationFormConfigResponseSchema,
  ManualNotificationErrorResponseSchema,
} from '@/app/api/_schemas/manual-notification.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';
import { hasPermissions } from '@/utils/permission.util';

import { Permission } from '@/types/permission.type';

import { getManualNotificationValidationScope } from '../_lib/manual-notification-access.util';
import { manualNotificationErrorResponse } from '../_lib/manual-notification-error.util';
import { getManualNotificationFormPreviewCounts } from '../_lib/manual-notification-target-count.util';

registerRoute({
  method: 'get',
  path: '/crm/notifications/form-config',
  summary: 'Get manual notification form configuration',
  description: 'Returns manual notification form metadata and target preview counts.',
  tags: ['Notification CRUD'],
  responses: [
    {
      status: 200,
      schema: GetManualNotificationFormConfigResponseSchema,
      description: 'Manual notification form configuration',
    },
    { status: 401, schema: ManualNotificationErrorResponseSchema, description: 'Unauthorized' },
    { status: 403, schema: ManualNotificationErrorResponseSchema, description: 'Forbidden' },
  ],
});

export async function GET(request: NextRequest) {
  const auth = getAuthUserFromRequest(request);
  if (!auth.ok) {
    return manualNotificationErrorResponse(auth.status, 'この操作を実行する権限がありません');
  }

  const canCreate = hasPermissions(toUserRole(auth.user), [Permission.ManualNotificationsCreate]);
  const canEdit = hasPermissions(toUserRole(auth.user), [Permission.ManualNotificationsEdit]);
  if (!canCreate && !canEdit) {
    return manualNotificationErrorResponse(403, 'この操作を実行する権限がありません');
  }
  const allowedStoreIds = getManualNotificationValidationScope(auth.user);
  if (allowedStoreIds !== null && allowedStoreIds.length === 0) {
    return manualNotificationErrorResponse(403, 'この操作を実行する権限がありません');
  }

  return NextResponse.json(
    GetManualNotificationFormConfigResponseSchema.parse({
      templates: MANUAL_NOTIFICATION_FORM_CONFIG_SEED.templates,
      targetPreviewCounts: getManualNotificationFormPreviewCounts(allowedStoreIds),
    }),
  );
}
