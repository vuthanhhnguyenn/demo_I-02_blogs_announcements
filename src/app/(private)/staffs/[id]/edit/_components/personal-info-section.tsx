'use client';

import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { adminStaffControllerEmailAvailabilityOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import { isValidEmailFormat } from '../../../create/_schemas/staff-create.schema';
import { ROW_DUPLICATE_MESSAGES } from '../../../create/_utils/staff-create.util';
import type { StaffEditFormValues } from '../_schemas/staff-edit-form.schema';
import { isEmailChanged } from '../_utils/staff-edit-email.util';

type EmailCheckStatus =
  | null
  | 'ok'
  | 'duplicate'
  | 'domain_not_registered'
  | 'domain_inactive'
  | 'email_too_long'
  | 'unknown';

interface PersonalInfoSectionProps {
  /** The staff's saved address — the baseline the 重複確認 button and the PATCH diff compare to. */
  currentEmail: string;
  /**
   * Why the email input is locked, or `null` when the operator may change it.
   * Y-01 - Bug No.16 / API-070 §6.5.3: only a cognito-route staff's address can change — a
   * Google account's address belongs to Google (`422 E-STF-016`).
   */
  emailLockReason: string | null;
}

export function PersonalInfoSection({ currentEmail, emailLockReason }: PersonalInfoSectionProps) {
  const form = useFormContext<StaffEditFormValues>();
  const queryClient = useQueryClient();
  const [emailCheckStatus, setEmailCheckStatus] = useState<EmailCheckStatus>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const watchedEmail = useWatch({ control: form.control, name: 'email' }) ?? '';

  const isEmailEditable = emailLockReason === null;
  // Only an edited address is worth asking about: `email-availability` does not know which
  // staff is being edited, so the staff's own current address always reads "duplicate"
  // (API-070 §7).
  const canCheckEmail =
    isEmailEditable &&
    isEmailChanged(watchedEmail, currentEmail) &&
    isValidEmailFormat(watchedEmail) &&
    !isCheckingEmail;

  // 重複確認 — advisory pre-check against the real endpoint; the authoritative check is the
  // PATCH itself (409 E-STF-002 / 422 E-DMN-006 / E-STF-016, mapped onto this field in page.tsx).
  const handleEmailCheck = () => {
    const email = form.getValues('email').trim().toLowerCase();
    setIsCheckingEmail(true);
    queryClient
      .fetchQuery(adminStaffControllerEmailAvailabilityOptions({ query: { email } }))
      .then((result) => {
        // Stale answer: the field moved on (form reset / save-time error) since the check began.
        if (form.getValues('email').trim().toLowerCase() !== email) return;
        if (result.available) {
          setEmailCheckStatus('ok');
          return;
        }
        const reason = result.reason;
        setEmailCheckStatus(
          reason === 'duplicate' ||
            reason === 'domain_not_registered' ||
            reason === 'domain_inactive' ||
            reason === 'email_too_long'
            ? reason
            : 'unknown',
        );
      })
      .catch(() => {
        // Advisory only — a failed pre-check leaves the form usable (global toast already fired).
        setEmailCheckStatus(null);
      })
      .finally(() => setIsCheckingEmail(false));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>基本情報</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Row 1: 氏名（姓） / 氏名（名） — both required */}
        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                氏名（姓）<span className="text-destructive ml-0.5">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                氏名（名）<span className="text-destructive ml-0.5">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Row 1b: フリガナ（姓） / フリガナ（名） — **disabled**, read-only.
            NOTE(spec-gap, 2026-09-18): out of scope per Y-01 — see
            `specs/020-staff-permission-management/spec.md` › "Out of scope for this spec".
            The backend supports them (`UpdateStaffRequestDto` / `StaffDetailDto`), so the
            divergence is spec-side, not a broken wire. Kept, not deleted, per the
            2026-09-18 decision; see the matching note in `staff-edit-form.schema.ts`.

            FIXED 2026-09-18: these were editable but `buildRequestBody` never sent them, so an
            edit was silently discarded behind a success toast. Disabled here rather than
            wired up, because Y-01
            keeps フリガナ out of scope. Re-enable only if Y-01 is amended to cover it, and
            then also add the fields to `buildRequestBody`. */}
        {/* <FormField
          control={form.control}
          name="last_name_kana"
          render={({ field }) => (
            <FormItem>
              <FormLabel>フリガナ（姓）</FormLabel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<div className="flex items-center gap-2" />}>
                    <FormControl>
                      <Input placeholder="ヤマダ" className="flex-1" disabled {...field} />
                    </FormControl>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">フリガナの変更は現在サポートされていません</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="first_name_kana"
          render={({ field }) => (
            <FormItem>
              <FormLabel>フリガナ（名）</FormLabel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<div className="flex items-center gap-2" />}>
                    <FormControl>
                      <Input placeholder="タロウ" className="flex-1" disabled {...field} />
                    </FormControl>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">フリガナの変更は現在サポートされていません</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <FormMessage />
            </FormItem>
          )}
        /> */}

        {/* Row 2: 携帯電話番号 — **hidden**.
            NOTE(spec-gap, 2026-09-18): out of scope per Y-01, same as フリガナ above.
            FIXED 2026-09-25 (Y-01 - Bug No.15): it was still rendered and saved even though
            neither Y-01 nor the prototype has it. Commented out the same way as フリガナ, and
            dropped from `buildRequestBody`; re-enable both together if Y-01 is amended. */}
        {/* <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>携帯電話番号</FormLabel>
              <FormControl>
                <Input placeholder="090-1234-5678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div /> */}

        {/* Row 3: メールアドレス（ログインID） — left col only (half width), required.
            Y-01 - Bug No.16: editable since API-070 v0.11.1 §6.5.3 accepts `email` on PATCH;
            locked (with the reason as tooltip) for Google-route staff. */}
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => {
            // A field error (blank / format / 128 cap / save-time 409·422) says the same thing
            // the 重複確認 line would, so show only one of them — the error wins.
            const showCheckResult = !fieldState.error;
            const emailRow = (
              <>
                <FormControl>
                  <Input
                    type="email"
                    className="flex-1"
                    // Locked while 重複確認 is in flight, so the result always describes the
                    // address on screen — a mid-check edit used to show 使用可能 for the old one.
                    disabled={!isEmailEditable || isCheckingEmail}
                    {...field}
                    onChange={(event) => {
                      setEmailCheckStatus(null);
                      field.onChange(event);
                    }}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={handleEmailCheck}
                  disabled={!canCheckEmail}
                >
                  重複確認
                </Button>
              </>
            );
            return (
              <FormItem>
                <FormLabel>
                  メールアドレス（ログインID）<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                {isEmailEditable ? (
                  <div className="flex items-center gap-2">{emailRow}</div>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger render={<div className="flex items-center gap-2" />}>
                        {emailRow}
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">{emailLockReason}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {showCheckResult && emailCheckStatus === 'ok' && (
                  <p className="text-success flex items-center gap-1 text-xs">
                    <Check className="size-3" />
                    このメールアドレスは使用可能です
                  </p>
                )}
                {showCheckResult && emailCheckStatus !== null && emailCheckStatus !== 'ok' && (
                  <p className="text-destructive flex items-center gap-1 text-xs">
                    <AlertTriangle className="size-3" />
                    {ROW_DUPLICATE_MESSAGES[emailCheckStatus]}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            );
          }}
        />
        {/* empty right col */}
        <div />
      </CardContent>
    </Card>
  );
}
