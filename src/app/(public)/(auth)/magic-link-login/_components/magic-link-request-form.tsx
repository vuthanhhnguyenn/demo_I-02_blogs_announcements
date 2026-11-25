'use client'; // interactive form state + the magic-link issue mutation
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import Link from 'next/link';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';

import { useResendCooldown } from '@/hooks/use-resend-cooldown';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { crmAuthControllerCrmMagicLinkIssueMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { type MagicLinkFormSchema, magicLinkFormSchema } from '../_schema/magic-link-form.schema';

export function MagicLinkRequestForm() {
  const [phase, setPhase] = useState<'form' | 'sent'>('form');
  const [sentEmail, setSentEmail] = useState('');
  const cooldown = useResendCooldown();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MagicLinkFormSchema>({
    resolver: zodResolver(magicLinkFormSchema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  });

  const issueMutation = useMutation({
    ...crmAuthControllerCrmMagicLinkIssueMutation(),
    meta: { suppressErrorToast: true },
    // research.md R13 — never branch on `accepted`; any 2xx means "show the sent state".
    onSuccess: (_data, variables) => {
      setSentEmail(variables.body.email);
      setPhase('sent');
      cooldown.start();
    },
  });

  function onSubmit(data: MagicLinkFormSchema) {
    issueMutation.mutate({ body: { email: data.email } });
  }

  function handleResend() {
    if (cooldown.isCoolingDown) return;
    issueMutation.mutate({ body: { email: sentEmail } });
  }

  return (
    <Card className="w-100">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">マジックリンクでログイン</CardTitle>
        <CardDescription>登録済みのメールアドレスを入力してください</CardDescription>
      </CardHeader>
      <CardContent>
        {phase === 'form' ? (
          <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
            {issueMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  メールの送信に失敗しました。時間をおいて再度お試しください。
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@joyfit.co.jp"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-destructive text-sm">{String(errors.email.message)}</p>
              )}
            </div>
            <Button className="w-full" type="submit" disabled={issueMutation.isPending}>
              ログインリンクを送信
            </Button>
            {/* Y-13 FR-S001: 経路②（メール認証）スタッフ向けのパスワード不要ログイン手段 */}
            <p className="text-muted-foreground text-xs">
              パスワードを使わずにログインできます。経路②（メール認証）のスタッフ向けの機能です。
            </p>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="bg-success/10 rounded-full p-4">
                <CheckCircle className="text-success size-8" />
              </div>
            </div>
            <div>
              <p className="font-medium">マジックリンクを送信しました</p>
              {/* An email address is one unbreakable token; without `wrap-anywhere` a long one
                  (~60+ chars) overruns the fixed-width card instead of wrapping. */}
              <p className="text-muted-foreground mt-1 text-sm wrap-anywhere">
                {sentEmail} 宛にログインリンクを送信しました
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                メール内のリンクは15分間有効・1回のみ使用できます
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={cooldown.isCoolingDown}
            >
              {cooldown.isCoolingDown
                ? `メールを再送信 (${cooldown.secondsLeft}秒)`
                : 'メールを再送信'}
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Button
          variant="link"
          className="text-sm"
          nativeButton={false}
          render={<Link href={navigate('/login')}>ログインに戻る</Link>}
        />
      </CardFooter>
    </Card>
  );
}
