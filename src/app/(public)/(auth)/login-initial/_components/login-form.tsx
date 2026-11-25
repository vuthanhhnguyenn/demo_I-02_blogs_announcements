import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { CognitoLoginForm } from './cognito-login-form';
import { GoogleLoginForm } from './google-login-form';

const GOOGLE_AUTH_PROVIDER = 'google';

interface LoginFormProps {
  email: string;
  authProvider: string;
  inviteToken: string;
  onChallenge: (challenge: { username: string; session: string }) => void;
  onExpired: () => void;
  /** `?error=` code handed back by the Google callback screen (see google-oidc.ts). */
  initialErrorCode?: string | null;
}

/**
 * Card header + read-only pre-filled email field, then the provider-specific slot
 */
export function LoginForm({
  email,
  authProvider,
  inviteToken,
  onChallenge,
  onExpired,
  initialErrorCode,
}: LoginFormProps) {
  return (
    <Card className="w-100">
      <CardHeader>
        <CardTitle className="text-lg">初回ログイン</CardTitle>
        <CardDescription className="text-sm">
          招待されたメールアドレスでログインしてください
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            value={email}
            disabled
            className="bg-muted text-muted-foreground cursor-not-allowed"
          />
        </div>
        {authProvider === GOOGLE_AUTH_PROVIDER ? (
          <GoogleLoginForm
            inviteToken={inviteToken}
            email={email}
            initialErrorCode={initialErrorCode}
          />
        ) : (
          <CognitoLoginForm
            email={email}
            inviteToken={inviteToken}
            onChallenge={onChallenge}
            onExpired={onExpired}
          />
        )}
      </CardContent>
    </Card>
  );
}
