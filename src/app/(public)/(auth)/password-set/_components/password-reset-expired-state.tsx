import Link from 'next/link';

import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { navigate } from '@/lib/routes/routes.util';

/**
 * FR-009 — reached both when `/password-set` is opened without valid `email`/`code` query
 * params and when Cognito rejects the confirmation code as expired/mismatched/used.
 */
export function PasswordResetExpiredState() {
  return (
    <Card className="w-100">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="bg-destructive/10 rounded-full p-4">
            <AlertCircle className="text-destructive size-8" />
          </div>
        </div>
        <div className="space-y-1 text-center">
          <CardTitle className="text-lg">リンクが無効または期限切れです</CardTitle>
          <CardDescription>
            パスワードリセットリンクの有効期限が切れているか、すでに使用済みです。
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={navigate('/password-reset')}>パスワードリセットをやり直す</Link>}
        />
      </CardContent>
    </Card>
  );
}
