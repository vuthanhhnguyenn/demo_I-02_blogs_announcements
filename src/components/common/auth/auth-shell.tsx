import type { ReactNode } from 'react';

import Logo from '@/assets/logo.svg';

interface AuthShellProps {
  children: ReactNode;
}

/**
 * Shared centered-card shell for the auth screens (first-time login, subsequent login, etc.):
 * brand lockup (logo + "JOYFIT CRM") fixed above the content slot.
 * Ported from `.cache/fitness-crm-ui/src/components/auth-shell.tsx`.
 */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="bg-muted flex min-h-screen flex-col items-center justify-center gap-8 py-12">
      <div className="flex flex-col items-center">
        <Logo role="img" aria-label="YAMAUCHI" className="mb-2 h-9 w-auto -translate-x-[9px]" />
        <p className="text-foreground text-center text-sm font-medium tracking-wide">JOYFIT CRM</p>
      </div>
      {children}
    </div>
  );
}
