'use client';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useNavigationBlocker } from '@/contexts/navigation-blocker.context';
import { persistStaffSession } from '@/utils/auth.util';
import { handleLogout } from '@/utils/global.util';
import { useMutation } from '@tanstack/react-query';
import {
  Bell,
  Check,
  ChevronDown,
  FlaskConical,
  HelpCircle,
  LogOut,
  Settings,
  User,
} from 'lucide-react';
import Cookies from 'universal-cookie';

import { useCognitoAuth } from '@/hooks/use-cognito-auth';

import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

import { AuthCrm } from '@/lib/api-real';
import { DEMO_ACCOUNTS, type DemoAccount, isDemoUserSwitchEnabled } from '@/lib/auth/demo-users';
import { navigate } from '@/lib/routes/routes.util';

import { CookieNames } from '@/types/global.enum';
import { UserRole } from '@/types/permission.type';

import { StoreSelector } from './store-selector';

// ─── Role display helpers ─────────────────────────────────────────────────────

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.System]: 'System',
  [UserRole.Headquarter]: 'Headquarter',
  [UserRole.Manager]: 'Manager',
  [UserRole.Staff]: 'Staff',
  [UserRole.Trainer]: 'Trainer',
  [UserRole.Observer]: 'Observer',
};

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  [UserRole.System]: 'bg-secondary/80 text-secondary-foreground border-secondary/20',
  [UserRole.Headquarter]: 'bg-primary/15 text-primary border-primary/20',
  [UserRole.Manager]: 'bg-info/15 text-info border-info/20',
  [UserRole.Staff]: 'bg-muted text-muted-foreground border-border',
  [UserRole.Trainer]: 'bg-success/15 text-success border-success/20',
  [UserRole.Observer]: 'bg-warning/15 text-warning border-warning/20',
};

export function AppHeader() {
  const { user, isLoading } = useAuthUser();
  const { initiateAuth } = useCognitoAuth();
  const { guardedAction, guardedPush } = useNavigationBlocker();

  const role = user?.role ?? UserRole.Staff;

  // Dev-only quick login — the same Cognito → `/crm/login` flow the login screen runs. A fabricated
  // session (what the old mock switch-user wrote) is rejected by the real API, which bounces the
  // tester out to `/login` instead of switching.
  const {
    mutate: quickLogin,
    isPending: switching,
    variables: switchingAccount,
  } = useMutation({
    mutationFn: async (account: DemoAccount) => {
      // Name the account in every failure: with six rows in the menu, Cognito's bare
      // "Incorrect username or password" leaves the tester guessing which seed needs fixing.
      const result = await initiateAuth({
        email: account.email,
        password: account.password,
      }).catch((error: unknown) => {
        throw new Error(
          `${account.email} のCognito認証に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        );
      });

      const idToken = result.AuthenticationResult?.IdToken;
      if (!idToken) {
        throw new Error(`${account.email} のCognito認証に失敗しました。`);
      }

      const { data } = await AuthCrm.crmAuthControllerLogin({ body: { idToken } });
      if (!data?.accessToken || !data?.refreshToken) {
        throw new Error(`${account.email} のCRMログインに失敗しました。`);
      }
      persistStaffSession(data);
    },
    onSuccess: () => {
      // The previous account's store scope means nothing to the one just signed in as.
      new Cookies().remove(CookieNames.CurrentStore, { path: '/' });
      window.location.reload();
    },
  });

  return (
    <header className="bg-sidebar border-sidebar-border sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between gap-4 border-b px-4">
      {/* Left: Store selector */}
      <StoreSelector />

      {/* Right: User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="bg-sidebar-accent/40 hover:bg-sidebar-accent flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors outline-none">
          {isLoading ? (
            <div className="bg-sidebar-accent size-7 animate-pulse rounded-full" />
          ) : (
            <div
              className={`bg-sidebar-accent text-sidebar-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium`}
            >
              {user?.name.slice(0, 2) || <User className="size-3.5" />}
            </div>
          )}
          <span className="text-sidebar-foreground/70 max-w-35 truncate text-sm">
            {isLoading ? '読み込み中...' : (user?.name ?? 'ユーザー')}
          </span>
          <ChevronDown className="text-sidebar-foreground/70 size-4 shrink-0" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64 rounded-lg shadow-lg" sideOffset={8}>
          {/* User info header — div instead of DropdownMenuLabel per prototype */}
          <div className="px-3 py-3">
            <div className="flex items-start gap-3">
              <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
                <span className="text-foreground text-xs font-medium">
                  {(user?.name ?? '').slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <Badge
                    variant="outline"
                    className={`h-4 rounded-sm px-1 text-[10px] ${ROLE_BADGE_CLASS[role]}`}
                  >
                    {ROLE_LABEL[role] ?? role}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-muted-foreground border-border h-auto max-w-full rounded-sm px-1 py-0.5 text-left text-[10px] leading-tight break-words whitespace-normal"
                  >
                    {user?.positionName}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Not built yet (scope 2026-10-23) — open the 準備中 placeholder */}
          <DropdownMenuItem onClick={() => guardedPush(navigate('/todo'))}>
            <User className="size-4" />
            プロフィール
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => guardedPush(navigate('/todo'))}>
            <Settings className="size-4" />
            アカウント設定
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => guardedPush(navigate('/todo'))}>
            <Bell className="size-4" />
            通知設定
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => guardedPush(navigate('/todo'))}>
            <HelpCircle className="size-4" />
            ヘルプ
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => guardedAction(() => handleLogout())}
          >
            <LogOut className="size-4" />
            ログアウト
          </DropdownMenuItem>

          {isDemoUserSwitchEnabled() && (
            <>
              <DropdownMenuSeparator />

              {/* Demo user switcher */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  className="text-muted-foreground"
                  // The submenu hangs well below the parent menu, so the pointer crosses empty
                  // space on its way to the lower rows. Base UI closes on the first slow, hesitant
                  // move there (safePolygon requires intent, and closeDelay defaults to 0).
                  closeDelay={300}
                >
                  <FlaskConical className="size-4" />
                  デモ: ユーザー切替
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-64">
                  {/* Anything rendered below the trigger in the PARENT menu sits right on the
                      diagonal from the trigger to the lower rows, and Base UI closes the submenu as
                      soon as the pointer lands on a non-item area of the parent — so this note lives
                      in here, where crossing it is harmless. */}
                  {DEMO_ACCOUNTS.map((account) => {
                    const isActive = account.email === user?.email;
                    const isSwitchingTo = switching && switchingAccount?.email === account.email;
                    return (
                      <DropdownMenuItem
                        key={account.email}
                        // Signing in takes a round trip through Cognito and `/crm/login` — keep the
                        // menu up so the row's spinner (or a failure toast) is actually visible.
                        closeOnClick={false}
                        disabled={switching}
                        onClick={() => !isActive && quickLogin(account)}
                      >
                        <div className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full">
                          <span className="text-foreground text-[9px] font-medium">
                            {ROLE_LABEL[account.role].slice(0, 2)}
                          </span>
                        </div>
                        <div className="ml-1 min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{account.position}</p>
                          <p className="text-muted-foreground truncate text-[10px]">
                            {account.email}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`h-4 shrink-0 rounded-sm px-1 text-[9px] ${ROLE_BADGE_CLASS[account.role]}`}
                        >
                          {ROLE_LABEL[account.role]}
                        </Badge>
                        {isSwitchingTo ? (
                          <Spinner className="ml-1 size-3 shrink-0" />
                        ) : (
                          isActive && <Check className="text-primary ml-1 size-3 shrink-0" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}

                  <Separator className="my-1" />
                  <div className="px-2 pt-1 pb-1.5">
                    <p className="text-muted-foreground/60 text-[10px]">
                      開発環境限定 — 選択したアカウントで実際にログインし直します
                    </p>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
