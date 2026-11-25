import { AuthShell } from '@/components/common/auth/auth-shell';

import { PasswordResetForm } from './_components/password-reset-form';

export default function Page() {
  return (
    <AuthShell>
      <PasswordResetForm />
    </AuthShell>
  );
}
