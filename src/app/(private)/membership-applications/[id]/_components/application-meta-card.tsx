import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { ENROLLMENT_ROUTE_LABELS } from '../../_constants/constants';
import {
  APPLICATION_SOURCE_LABELS,
  type ApplicationDetail,
  formatApplicationDate,
} from './membership-application.utils';

interface ApplicationMetaCardProps {
  app: ApplicationDetail;
}

function Field({ label, value, mono }: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <span className={`text-sm wrap-anywhere ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export function ApplicationMetaCard({ app }: Readonly<ApplicationMetaCardProps>) {
  // `proxy` is null exactly when the member applied from the app.
  const { proxy } = app;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">申請情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-3">
          <Field label="申請ID" value={app.applicationNumber} mono />
          <Field label="申請日時" value={formatApplicationDate(app.appliedAt)} />
          <Field
            label="申請元"
            value={APPLICATION_SOURCE_LABELS[app.applicationSource] ?? app.applicationSource}
          />
          <Field label="入会経路" value={ENROLLMENT_ROUTE_LABELS[app.enrollmentRoute]} />
          <Field label="更新日時" value={formatDateYYYYMMDD_HHMM(app.lastStatusChangeAt, '—')} />
          {proxy && (
            <Field
              label="代理申請者"
              value={proxy.proxyStaff?.displayName ?? (proxy.proxyStaff ? 'スタッフ' : '—')}
            />
          )}
          {proxy?.agreedAt && (
            <Field label="合意日時" value={formatDateYYYYMMDD_HHMM(proxy.agreedAt, '—')} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
