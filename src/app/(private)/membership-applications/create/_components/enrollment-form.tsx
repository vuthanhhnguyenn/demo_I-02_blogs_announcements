'use client';
// Holds local UI/dialog state and mutation calls — client-only.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { canSellToGender } from '@/app/(private)/area-master/_utils/area-gender.util';
import { useAuthUser } from '@/contexts/auth-user.context';
import { calcAge, isBelowMinAge } from '@/utils/age.util';
import { formatYen } from '@/utils/format.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';

import { DisabledReasonButton } from '@/components/common/disabled-reason-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminApplicationControllerBlacklistPrecheckMutation,
  adminApplicationControllerCreateMutation,
  adminApplicationControllerListQueryKey,
  adminApplicationControllerPriceEstimateMutation,
  adminPromotionCodeControllerListOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  ApplicationBlacklistDto,
  BlacklistPrecheckDto,
  PriceEstimateResponseDto,
  StoreCampaignDto,
} from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { BOUNDED_DIALOG_CLASS } from '../../_constants/constants';
import {
  GENDER_TO_API,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_TO_API,
} from '../_constants/enrollment-form.constants';
import { useEnrollmentTerms } from '../_hooks/use-enrollment-terms';
import {
  type DirectEnrollmentFormValues,
  directEnrollmentSchema,
  isPastBirthDate,
} from '../_schemas/enrollment-form.schema';
import { toCreateApplicationBody, toPrecheckBody } from '../_utils/enrollment-create.util';
import { calcEnrollmentFees } from '../_utils/enrollment-fee.util';
import { toEnrollmentFieldErrors } from '../_utils/enrollment-server-errors.util';
import { ApplicantInfoSection } from './applicant-info-section';
import { BlacklistResultSection } from './blacklist-result-section';
import { ContractInfoSection } from './contract-info-section';
import { EnrollmentRouteSection } from './enrollment-route-section';
import { type EstimateState, FeeSection } from './fee-section';
import { ProxyRecordSection } from './proxy-record-section';
import { TermsConsentSection } from './terms-consent-section';

interface ContractNames {
  store: string | null;
  plan: string | null;
  campaign: string | null;
}

const EMPTY_CONTRACT_NAMES: ContractNames = { store: null, plan: null, campaign: null };

interface EnrollmentFormProps {
  readonly prefillFamilyName?: string;
  readonly prefillGivenName?: string;
  readonly prefillFamilyNameKana?: string;
  readonly prefillGivenNameKana?: string;
  readonly prefillBirthDate?: string;
  readonly prefillPhone?: string;
  readonly prefillEmail?: string;
}

export function EnrollmentForm(props: Readonly<EnrollmentFormProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();
  const { user } = useAuthUser();
  const isPrefilled = Boolean(
    props.prefillFamilyName ||
    props.prefillGivenName ||
    props.prefillFamilyNameKana ||
    props.prefillGivenNameKana ||
    props.prefillBirthDate ||
    props.prefillPhone ||
    props.prefillEmail,
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [blCheckResult, setBlCheckResult] =
    useState<ApplicationBlacklistDto['matchResult']>('unchecked');
  const [estimateResult, setEstimateResult] = useState<{
    key: string;
    breakdown: PriceEstimateResponseDto | null;
  } | null>(null);

  const form = useForm<DirectEnrollmentFormValues>({
    resolver: zodResolver(directEnrollmentSchema),
    defaultValues: {
      applicant: {
        family_name: props.prefillFamilyName ?? '',
        given_name: props.prefillGivenName ?? '',
        family_name_kana: props.prefillFamilyNameKana ?? '',
        given_name_kana: props.prefillGivenNameKana ?? '',
        birth_date: props.prefillBirthDate ?? '',
        gender: undefined,
        phone: props.prefillPhone ?? '',
        email: props.prefillEmail ?? '',
        address: { postal_code: '', prefecture: '', street_address: '', building: '' },
        face_photo_id: '',
      },
      contract: {
        brand_id: undefined,
        store_id: '',
        plan_id: '',
        usage_start_date: '',
        payment_method: undefined,
        campaign_id: '',
        referral_code: '',
        card_token: '',
        jaccs_contractor_number: '',
        jaccs_callback_status: '',
        enrollment_fee_master_id: null,
      },
      consent: {
        agreement_datetime: '',
        parental_consent: false,
        guardian_name: '',
        guardian_consent_at: '',
        terms: {},
      },
    },
    mode: 'onChange',
  });

  const handleUploadingChange = useCallback((uploading: boolean) => {
    setUploadCount((prev) => (uploading ? prev + 1 : Math.max(0, prev - 1)));
  }, []);

  const brand = useWatch({ control: form.control, name: 'contract.brand_id' });
  const storeId = useWatch({ control: form.control, name: 'contract.store_id' });
  const planId = useWatch({ control: form.control, name: 'contract.plan_id' });
  const paymentMethod = useWatch({ control: form.control, name: 'contract.payment_method' });
  const birthDate = useWatch({ control: form.control, name: 'applicant.birth_date' });
  const agreementDatetime = useWatch({ control: form.control, name: 'consent.agreement_datetime' });
  const parentalConsent = useWatch({ control: form.control, name: 'consent.parental_consent' });
  const guardianName = useWatch({ control: form.control, name: 'consent.guardian_name' });
  const guardianConsentAt = useWatch({
    control: form.control,
    name: 'consent.guardian_consent_at',
  });
  const agreedTerms = useWatch({ control: form.control, name: 'consent.terms' });
  const campaignId = useWatch({ control: form.control, name: 'contract.campaign_id' });
  const referralCode = useWatch({ control: form.control, name: 'contract.referral_code' });
  const cardToken = useWatch({ control: form.control, name: 'contract.card_token' });
  const usageStartDate = useWatch({ control: form.control, name: 'contract.usage_start_date' });
  // C-01 FR-M009: 手動 by default, 紹介経由 once a 紹介コード is entered (prototype 9/16).
  const routeLabel = referralCode.trim() ? '紹介経由' : '手動';

  // Cross-field errors (age vs brand, parental consent) must be re-validated
  // whenever brand or birth date changes, or they silently vanish (RHF onChange
  // mode + zodResolver only re-runs the field that changed by default).
  useEffect(() => {
    if (brand || birthDate) {
      void form.trigger(['applicant.birth_date', 'consent.parental_consent']);
    }
  }, [brand, birthDate, form]);

  // Display names of the picked store / plan / campaign for the confirm panel. The paged
  // selects only hold the rows loaded so far, so the name is captured at pick time.
  const [contractNames, setContractNames] = useState<ContractNames>(EMPTY_CONTRACT_NAMES);

  // The picked campaign (its plan's gender condition) and the notice a gender change dropped it with.
  const [pickedCampaign, setPickedCampaign] = useState<StoreCampaignDto | null>(null);
  const [campaignRemovedNotice, setCampaignRemovedNotice] = useState('');

  const handleBrandChange = useCallback(() => {
    setContractNames(EMPTY_CONTRACT_NAMES);
    setPickedCampaign(null);
    setCampaignRemovedNotice('');
    form.resetField('contract.store_id');
    form.resetField('contract.plan_id');
    form.resetField('contract.campaign_id');
    form.resetField('contract.enrollment_fee_master_id');
    // The terms documents follow the brand — agreements to another set do not carry over.
    form.resetField('consent.terms');
  }, [form]);

  // Plan and campaign are store-scoped masters — a store change invalidates both.
  const handleStoreChange = useCallback(
    (storeName: string | null) => {
      setContractNames({ store: storeName, plan: null, campaign: null });
      setPickedCampaign(null);
      setCampaignRemovedNotice('');
      form.resetField('contract.plan_id');
      form.resetField('contract.campaign_id');
    },
    [form],
  );

  // The campaign decides the plan (C-01 L212, integration-plan D17): API-098 §5.2 rejects any
  // other planId with E-VAL-001, so the plan is never chosen on its own.
  const handleCampaignChange = useCallback(
    (campaign: StoreCampaignDto | null) => {
      setPickedCampaign(campaign);
      setCampaignRemovedNotice('');
      form.setValue('contract.plan_id', campaign?.campaign.planId ?? '', { shouldDirty: true });
      setContractNames((prev) => ({
        ...prev,
        // planName is '' when the BE join misses — still a picked plan, shown as 「—」.
        plan: campaign ? campaign.campaign.planName || '—' : null,
        campaign: campaign?.campaign.name ?? null,
      }));
    },
    [form],
  );

  // E-02 FR-016 (prototype 11/12): a gender change that the picked campaign's plan no longer meets
  // drops the campaign (and the plan it decided) and says so under the field. Unlike the prototype,
  // any later gender change clears that notice, so it never names a 性別 the field no longer holds.
  const handleGenderChange = useCallback(
    (gender: string, label: string) => {
      setCampaignRemovedNotice('');
      const apiGender = GENDER_TO_API[gender as keyof typeof GENDER_TO_API] ?? null;
      if (!pickedCampaign || canSellToGender(pickedCampaign.planGenderCondition, apiGender)) return;
      form.resetField('contract.campaign_id');
      form.resetField('contract.plan_id');
      setContractNames((prev) => ({ ...prev, plan: null, campaign: null }));
      setCampaignRemovedNotice(
        `性別を${label}に変えたため、選んでいたキャンペーン（${pickedCampaign.campaign.name}）を外しました。選び直してください`,
      );
      setPickedCampaign(null);
    },
    [form, pickedCampaign],
  );
  const applicantGenderValue = useWatch({ control: form.control, name: 'applicant.gender' });
  const applicantGender = applicantGenderValue
    ? (GENDER_TO_API[applicantGenderValue as keyof typeof GENDER_TO_API] ?? null)
    : null;

  const storeLabel = (storeId && contractNames.store) || '—';
  const enrollmentTerms = useEnrollmentTerms(
    brand === 'FIT365' || brand === 'JOYFIT' ? brand : undefined,
  );
  const planLabel = (planId && contractNames.plan) || '—';
  const campaignLabel = (campaignId && contractNames.campaign) || null;

  const applicantFields = useWatch({
    control: form.control,
    name: [
      'applicant.family_name',
      'applicant.given_name',
      'applicant.birth_date',
      'applicant.phone',
      'applicant.email',
      'applicant.address.postal_code',
      'applicant.address.prefecture',
      'applicant.address.street_address',
      'applicant.address.building',
    ],
  });
  const [
    familyName,
    givenName,
    dob,
    phone,
    email,
    postalCode,
    prefecture,
    streetAddress,
    building,
  ] = applicantFields;

  const { errors: applicantErrors } = useFormState({
    control: form.control,
    name: [
      'applicant.family_name',
      'applicant.given_name',
      'applicant.birth_date',
      'applicant.phone',
      'applicant.email',
      'applicant.address',
    ],
  });
  const applicantErr = applicantErrors.applicant;
  const keysValid =
    !applicantErr?.family_name &&
    !applicantErr?.given_name &&
    !applicantErr?.birth_date &&
    !applicantErr?.phone &&
    !applicantErr?.email;
  const addressValid = !applicantErr?.address;

  // B14 (decided 2026-10-07): `blacklist-precheck` needs 姓・名・生年月日・電話・メール together, so
  // the check runs once all five are valid (住所 is added when complete) — not on any single key.
  const precheckBody = keysValid
    ? toPrecheckBody({
        family_name: familyName,
        given_name: givenName,
        birth_date: dob,
        phone,
        email,
        address: addressValid
          ? { postal_code: postalCode, prefecture, street_address: streetAddress, building }
          : { postal_code: '', prefecture: '', street_address: '' },
      })
    : null;
  const precheckKey = precheckBody ? JSON.stringify(precheckBody) : '';

  const { mutate: checkBlacklist } = useMutation({
    ...adminApplicationControllerBlacklistPrecheckMutation(),
    // A failed screen leaves the card at 未照合 — not worth an error toast while typing.
    meta: { suppressErrorToast: true },
    onSuccess: (data) => setBlCheckResult(data.matchResult),
    onError: () => setBlCheckResult('unchecked'),
  });
  const blState = precheckKey ? blCheckResult : 'unchecked';

  useEffect(() => {
    if (!precheckKey) return;
    const timer = setTimeout(() => {
      // The serialised key doubles as the request body — it changes only when a key does.
      const body: BlacklistPrecheckDto = JSON.parse(precheckKey);
      checkBlacklist({ body });
    }, 500);
    return () => clearTimeout(timer);
  }, [precheckKey, checkBlacklist]);

  // ── Fee estimate (FR-M006) — recomputed whenever its inputs change ──────────
  const { mutate: estimatePrice } = useMutation({
    ...adminApplicationControllerPriceEstimateMutation(),
    meta: { suppressErrorToast: true },
  });
  const estimateKey =
    storeId && planId && campaignId && usageStartDate
      ? JSON.stringify({ storeId, planId, campaignId, usageStartDate, paymentMethod })
      : '';

  useEffect(() => {
    if (!estimateKey) return;
    const timer = setTimeout(() => {
      estimatePrice(
        {
          body: {
            storeId,
            planId,
            campaignId,
            usageStartDate,
            ...(paymentMethod ? { paymentMethod: PAYMENT_METHOD_TO_API[paymentMethod] } : {}),
          },
        },
        {
          onSuccess: (data) => setEstimateResult({ key: estimateKey, breakdown: data }),
          onError: () => setEstimateResult({ key: estimateKey, breakdown: null }),
        },
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [estimateKey, storeId, planId, campaignId, usageStartDate, paymentMethod, estimatePrice]);

  // Only the answer for the current inputs counts — a stale (older, slower) one is ignored.
  const isCurrentEstimate = !!estimateKey && estimateResult?.key === estimateKey;
  const estimate = isCurrentEstimate ? (estimateResult?.breakdown ?? null) : null;
  const estimateState: EstimateState = !estimateKey
    ? 'idle'
    : !isCurrentEstimate
      ? 'loading'
      : estimate
        ? 'ready'
        : 'error';

  // Guards against duplicate registrations from clicks that land faster than a
  // React re-render can disable the button — isPending alone lags one commit.
  const isSubmittingRef = useRef(false);
  // A failure naming form fields (E-VAL-001 details / E-ENR-004) is shown under those fields;
  // anything else falls back to the shared toast wording (D11).
  const submitMutation = useMutation({
    ...adminApplicationControllerCreateMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminApplicationControllerListQueryKey() });
      setCompleteOpen(true);
    },
    onError: (error) => {
      const fieldErrors = toEnrollmentFieldErrors(error);
      if (fieldErrors.length === 0) {
        toast.error(resolveApiErrorMessage(error));
        return;
      }
      fieldErrors.forEach(({ name, message }) => form.setError(name, { message }));
      // Focusing a select only reaches its hidden input, which does not scroll — bring the
      // first invalid field into view explicitly (BUG-D-21).
      scrollToFirstError();
      toast.error('入力内容に誤りがあります。各項目をご確認ください。');
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  /**
   * 紹介コード → `promotionCodeId` (D12): the API takes the id, so the typed code is looked
   * up by exact match. Null when no code was entered; undefined when it does not resolve;
   * `{ lookupError }` when the lookup itself failed — never reported as not-found (BUG-D-10);
   * the API's own message is shown for it.
   */
  async function resolvePromotionCodeId(
    code: string,
  ): Promise<string | null | undefined | { lookupError: unknown }> {
    const trimmed = code.trim();
    if (!trimmed) return null;
    try {
      const result = await queryClient.fetchQuery(
        adminPromotionCodeControllerListOptions({ query: { codePrefix: trimmed, limit: 20 } }),
      );
      const match = result.items.find((item) => item.code.toLowerCase() === trimmed.toLowerCase());
      return match?.id;
    } catch (error) {
      return { lookupError: error };
    }
  }

  async function handlePrimaryClick() {
    // Focus lands on the first invalid field so the operator sees what to fix (BUG-D-03).
    const valid = await form.trigger(undefined, { shouldFocus: true });
    if (!valid) {
      scrollToFirstError();
      return;
    }
    setConfirmOpen(true);
  }

  async function handleConfirmSubmit() {
    if (isSubmittingRef.current || !user) return;
    isSubmittingRef.current = true;
    const values = form.getValues();
    const promotionCodeId = await resolvePromotionCodeId(values.contract.referral_code);
    if (
      promotionCodeId === undefined ||
      (promotionCodeId !== null && typeof promotionCodeId === 'object')
    ) {
      isSubmittingRef.current = false;
      setConfirmOpen(false);
      form.setError(
        'contract.referral_code',
        {
          message:
            promotionCodeId === undefined
              ? '紹介コードが見つかりません'
              : resolveApiErrorMessage(promotionCodeId.lookupError),
        },
        { shouldFocus: true },
      );
      return;
    }
    setConfirmOpen(false);
    submitMutation.mutate({
      body: toCreateApplicationBody(values, {
        staffId: user.staffId,
        promotionCodeId,
        isMinor,
        termsDocumentIds: enrollmentTerms.terms.map((t) => t.id),
      }),
    });
  }

  function handleComplete() {
    setCompleteOpen(false);
    toast.success('入会申請を登録しました（未審査）');
    router.push(navigate('/membership-applications'));
  }

  const age = birthDate && isPastBirthDate(birthDate) ? calcAge(birthDate) : null;
  const belowMin = age !== null && brand ? isBelowMinAge(age, brand) : false;
  const isMinor = age !== null && !belowMin && age < 18;
  // The terms list depends on the store; an empty or failed list blocks submit — the API
  // requires at least one consent row.
  // Unloaded pages may hold terms that need consent, so submit also waits for the last page.
  const termsBlockedReason = enrollmentTerms.isLoading
    ? '規約を読み込み中です'
    : enrollmentTerms.isError
      ? '規約を取得できなかったため登録できません'
      : enrollmentTerms.hasNextPage
        ? '未表示の規約があります。規約一覧を最後までスクロールしてください'
        : enrollmentTerms.terms.length === 0
          ? '同意が必要な規約が登録されていないため登録できません'
          : !enrollmentTerms.terms.every((t) => agreedTerms[t.id])
            ? 'すべての規約に同意が必要です'
            : undefined;

  // A disabled 入会登録 always states why (cross-screen UI rule, prototype 9/17).
  const submitDisabledReason = belowMin
    ? '年齢条件不適合のため登録できません'
    : isMinor && !parentalConsent
      ? '保護者同意の確認が必要です'
      : isMinor && (!guardianName.trim() || !guardianConsentAt)
        ? '保護者氏名・同意日時の入力が必要です'
        : termsBlockedReason
          ? termsBlockedReason
          : !agreementDatetime
            ? '合意日時が未入力のため登録できません'
            : paymentMethod === 'credit_card' && !cardToken.trim()
              ? 'カードトークンが未入力です'
              : uploadCount > 0
                ? '顔写真をアップロード中です'
                : undefined;

  const fees = calcEnrollmentFees(estimate);

  return (
    <>
      <Form {...form}>
        <form
          noValidate
          onSubmit={(e) => e.preventDefault()}
          className="mx-auto flex max-w-240 flex-col gap-6"
        >
          <EnrollmentRouteSection routeLabel={routeLabel} />
          <ApplicantInfoSection
            control={form.control}
            onUploadingChange={handleUploadingChange}
            isPrefilled={isPrefilled}
            onGenderChange={handleGenderChange}
          />
          <TermsConsentSection
            control={form.control}
            hasBrand={!!brand}
            terms={enrollmentTerms.terms}
            isLoading={enrollmentTerms.isLoading}
            isError={enrollmentTerms.isError}
            hasNextPage={enrollmentTerms.hasNextPage}
            isFetchingNextPage={enrollmentTerms.isFetchingNextPage}
            onLoadMore={() => void enrollmentTerms.fetchNextPage()}
          />
          <ContractInfoSection
            control={form.control}
            onBrandChange={handleBrandChange}
            onStoreChange={handleStoreChange}
            onCampaignChange={handleCampaignChange}
            planName={planId ? contractNames.plan : null}
            applicantGender={applicantGender}
            campaignRemovedNotice={campaignRemovedNotice}
          />
          <ProxyRecordSection control={form.control} />
          <BlacklistResultSection state={blState} />
          <FeeSection
            brand={brand}
            fees={fees}
            estimateState={estimateState}
            campaignLabel={campaignLabel}
          />
          <div className="flex items-center justify-end gap-2 border-t p-4">
            <Button
              variant="outline"
              size="lg"
              type="button"
              onClick={() => router.push(navigate('/membership-applications'))}
            >
              キャンセル
            </Button>
            <DisabledReasonButton
              size="lg"
              type="button"
              disabled={submitDisabledReason !== undefined}
              disabledReason={submitDisabledReason}
              onClick={handlePrimaryClick}
            >
              入会登録
            </DisabledReasonButton>
          </div>
        </form>
      </Form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className={BOUNDED_DIALOG_CLASS}>
          <AlertDialogHeader>
            <AlertDialogTitle>入会申請の内容を確認</AlertDialogTitle>
            <AlertDialogDescription>
              下記の内容で入会申請を登録します。申請は「未審査」として入会申請一覧に追加され、審査・承認後に会員レコードが生成されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">入会経路</span>
              <span className="min-w-0 text-right font-medium wrap-anywhere">{routeLabel}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">ブランド</span>
              <span className="min-w-0 text-right wrap-anywhere">{brand || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">入会店舗</span>
              <span className="min-w-0 text-right wrap-anywhere">{storeLabel}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">プラン</span>
              <span className="min-w-0 text-right wrap-anywhere">{planLabel}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">決済方法</span>
              <span className="min-w-0 text-right wrap-anywhere">
                {paymentMethod ? PAYMENT_METHOD_LABELS[paymentMethod] : '—'}
              </span>
            </div>
            {/* 入会金 campaign discount — same treatment as the approve dialog (prototype 9/17) */}
            {fees.enrollmentFee !== null && fees.enrollmentFeeDiscount > 0 && (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">入会金（定価）</span>
                  <span className="text-muted-foreground line-through">
                    {formatYen(fees.enrollmentFee)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-success min-w-0 wrap-anywhere">
                    入会金{fees.enrollmentFeeDiscount >= fees.enrollmentFee ? '免除' : '割引'}
                    （キャンペーン・{campaignLabel}）
                  </span>
                  <span className="text-success shrink-0 font-medium whitespace-nowrap">
                    -{formatYen(fees.enrollmentFeeDiscount)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">初期費用合計</span>
              <span className="font-medium">{formatYen(fees.total)}</span>
            </div>
            {age !== null && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">年齢</span>
                <span>
                  {age}歳
                  {isMinor && parentalConsent && (
                    <span className="text-success ml-2 text-xs">保護者同意確認済み</span>
                  )}
                </span>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitMutation.isPending}>戻る</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmSubmit()}
              disabled={submitMutation.isPending}
            >
              申請を登録
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* The record already exists — Esc / outside click must leave the filled form too, or a
          second 入会登録 would register a duplicate (BUG-D-11). */}
      <AlertDialog
        open={completeOpen}
        onOpenChange={(open) => {
          if (!open) handleComplete();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>入会申請を登録しました</AlertDialogTitle>
            <AlertDialogDescription>
              申請を「未審査」として入会申請一覧に追加しました。審査・承認後に会員レコードが生成されます。入会申請一覧に戻ります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleComplete}>完了</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
export type { DirectEnrollmentFormValues } from '../_schemas/enrollment-form.schema';
