import { AuthShell } from '@/components/common/auth/auth-shell';

import { MagicLinkRequestForm } from './_components/magic-link-request-form';

export default function Page() {
  return (
    <AuthShell>
      <MagicLinkRequestForm />
    </AuthShell>
  );
}
