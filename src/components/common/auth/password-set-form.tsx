'use client'; // interactive password strength/visibility state and form submission
import { type ReactNode, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { TEXT_MAX_LENGTH } from '@/constants/app.constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Circle, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  type PasswordSetFormValues,
  checkPasswordRequirements,
  getPasswordStrength,
  passwordSetFormSchema,
} from '../../../app/(public)/(auth)/_schemas/password-set-form.schema';

interface PasswordSetFormProps {
  title: ReactNode;
  description: ReactNode;
  submitLabel: string;
  /** Inline alert(s) rendered above the fields — the caller owns error messaging/state. */
  banner?: ReactNode;
  isSubmitting?: boolean;
  onSubmit: (data: PasswordSetFormValues) => void | Promise<void>;
}

// Y-13 FR-M002 (L181): 8文字以上／英大文字・英小文字／数字 の3要件のみ（記号は要件外）。
const REQUIREMENT_ROWS = [
  { key: 'length' as const, label: '8文字以上' },
  { key: 'upperLower' as const, label: '大文字・小文字を含む' },
  { key: 'number' as const, label: '数字を含む' },
];

// インデックスは満たした要件数（0〜3）＝ 強度バーのセグメント数。
const STRENGTH_COLORS = ['bg-muted', 'bg-destructive', 'bg-warning', 'bg-success'];

/**
 * Shared new-password card: input with visibility toggle, live requirement checklist,
 * strength bar, and confirm-password field with mismatch messaging. Used by both the
 * first-time-login forced password change and (later) the standalone AUTH-03 password-set
 * screen — those differ in title/description/submit behavior, not in the form itself.
 */
export function PasswordSetForm({
  title,
  description,
  submitLabel,
  banner,
  isSubmitting,
  onSubmit,
}: PasswordSetFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Synchronous re-entrancy guard — `isSubmitting`/`isValid` are React state and only take
  // effect after a re-render, so a rapid multi-click within the same tick can fire the submit
  // handler more than once before the button actually disables. A ref check is immediate.
  const submitGuardRef = useRef(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid },
  } = useForm<PasswordSetFormValues>({
    resolver: zodResolver(passwordSetFormSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const newPassword = useWatch({ control, name: 'newPassword' });
  const confirmPassword = useWatch({ control, name: 'confirmPassword' });
  const requirements = checkPasswordRequirements(newPassword);
  const strength = getPasswordStrength(requirements);
  const confirmMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function guardedSubmit() {
    if (submitGuardRef.current) return;
    submitGuardRef.current = true;
    try {
      await handleSubmit(onSubmit)();
    } finally {
      submitGuardRef.current = false;
    }
  }

  return (
    <Card className="w-100">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {banner}

        <div className="space-y-2">
          <Label htmlFor="newPassword">新パスワード</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="新しいパスワードを入力"
              className="pr-10"
              maxLength={TEXT_MAX_LENGTH}
              {...register('newPassword')}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-full w-10 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="text-muted-foreground size-4" />
              ) : (
                <Eye className="text-muted-foreground size-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {REQUIREMENT_ROWS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              {requirements[key] ? (
                <Check className="text-success size-4 shrink-0" />
              ) : (
                <Circle className="text-muted-foreground size-4 shrink-0" />
              )}
              <span className="text-muted-foreground text-xs">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                strength >= i ? STRENGTH_COLORS[strength] : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">パスワード確認</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              placeholder="パスワードを再入力"
              className="pr-10"
              maxLength={TEXT_MAX_LENGTH}
              {...register('confirmPassword')}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-full w-10 hover:bg-transparent"
              onClick={() => setShowConfirm(!showConfirm)}
              tabIndex={-1}
            >
              {showConfirm ? (
                <EyeOff className="text-muted-foreground size-4" />
              ) : (
                <Eye className="text-muted-foreground size-4" />
              )}
            </Button>
          </div>
          {confirmMismatch && <p className="text-destructive text-xs">パスワードが一致しません</p>}
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={guardedSubmit}
          disabled={!isValid || isSubmitting}
        >
          {submitLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
