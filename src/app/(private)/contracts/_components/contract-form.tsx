'use client';

import { useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';

import { AlertTriangle } from 'lucide-react';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import type { PlanImageDto } from '@/lib/api-real/types.gen';

import { usePlanThumbnailUpload } from '../_hooks/use-plan-thumbnail-upload';
import type {
  ContractFormSubmitValues,
  ContractFormValues,
} from '../_schemas/contract-form.schema';
import { ContractFormBasicInfo } from './contract-form-basic-info';
import { ContractFormConfirmation } from './contract-form-confirmation';
import { ContractFormPricingConditions } from './contract-form-pricing-conditions';
import { Stepper } from './contract-form-stepper';

/** Fields rendered by step 1, used to send a failed submit back to the step that owns the error. */
const STEP_ONE_FIELDS: (keyof ContractFormValues)[] = [
  'name',
  'contractType',
  'storeId',
  'otherStoreAvailable',
  'brandEnum',
  'parentPlanId',
  'legacyCode',
  'isMultiUsable',
  'hasCompanionBenefit',
  'nameForMember',
  'description',
  'corporateId',
  'termsId',
  'thumbnailS3Key',
  'publicDescription',
  'remarks',
];

/** Fields rendered by step 2, validated before the operator moves on to the confirmation. */
const STEP_TWO_FIELDS: (keyof ContractFormValues)[] = [
  'priceTaxIncluded',
  'suspensionFee',
  'cancellationFee',
  'taxRate',
  'accountingCode',
  'enrollmentFee',
  'registrationFee',
  'cardIssueFee',
  'maintenanceFee',
  'usageStartDate',
  'monthlyVisitLimit',
  'usageHours',
  'suspendableMonths',
  'cancellationFeeMonths',
  'prepaidMonths',
  'minAge',
  'maxAge',
];

interface ContractFormProps {
  isEdit?: boolean;
  /** 複製 mode — saved through API-087 §8, whose `overrides` carries no ブランド / 親主契約 either. */
  isCopy?: boolean;
  /** 主契約ID of the source master when the form was opened through the 複製 action. */
  copyFromLabel?: string;
  /** G-01 FR-M007 子主契約の作成 — a 複製 whose 親主契約 is the source master itself. */
  isChildCreate?: boolean;
  /** 主契約名 of the source master; named as the 親主契約 in child-create mode. */
  sourceName?: string;
  /** Own 主契約ID when editing; used for the read-only 主契約ID field. */
  planCode?: string;
  /** Own plan id when editing; keeps the master out of its own 親主契約 options. */
  planId?: string;
  /** 企業名 of the master being edited — the corporate picker has no by-id lookup. */
  corporateName?: string | null;
  /** Pictures of the master being edited or copied — previews the stored サムネイル. */
  images?: PlanImageDto[];
  isSubmitting?: boolean;
  /** Runs a navigation that leaves the form through the unsaved-changes confirmation. */
  onLeave: (go: () => void) => void;
  onCancel: () => void;
  onSubmit: (values: ContractFormSubmitValues) => void;
}

export function ContractForm({
  isEdit = false,
  isCopy = false,
  copyFromLabel,
  isChildCreate = false,
  sourceName,
  planCode,
  planId,
  corporateName,
  images,
  isSubmitting = false,
  onLeave,
  onCancel,
  onSubmit,
}: Readonly<ContractFormProps>) {
  const [currentStep, setCurrentStep] = useState(1);
  // Step 1's brand change may drop the 利用できるエリア; step 2 says so (prototype 11/12).
  const [areaRemovedNotice, setAreaRemovedNotice] = useState('');
  // Lives here, not in step 1: that step unmounts on 次へ and would lose the preview of a fresh
  // upload, leaving the frame to render the bare `s3Key` as a broken image on the way back.
  const { thumbnailPreviews, uploadThumbnail } = usePlanThumbnailUpload(images);
  // The new `s3Key` only reaches the form once the upload resolves, so moving on or saving before
  // then would persist the previous thumbnail and silently drop the picked one.
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
  const isBusy = isSubmitting || isThumbnailUploading;
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const form = useFormContext<ContractFormValues>();
  const scrollToFirstError = useScrollToFirstError();

  /**
   * G-01 FR-M002: 店舗 is required exactly for 特殊契約, and 企業 exactly for 法人会員. Both rules
   * live in schema-level `refine`s, which zod skips while any other required field is still empty
   * — so on step 1 of a fresh form they would never fire. Check them explicitly here.
   */
  const validateStepOneConditionalFields = () => {
    const values = form.getValues();
    let isValid = true;
    if (values.contractType === 'special' && !values.storeId) {
      form.setError('storeId', {
        type: 'manual',
        message: '特殊契約の場合は店舗を選択してください',
      });
      isValid = false;
    }
    if (values.contractType === 'corporate' && !values.corporateId) {
      form.setError('corporateId', {
        type: 'manual',
        message: '法人会員の場合は企業を選択してください',
      });
      isValid = false;
    }
    return isValid;
  };

  const handleNext = async () => {
    if (isThumbnailUploading) return;
    let fieldsToValidate: (keyof ContractFormValues)[] = [];
    if (currentStep === 1) {
      fieldsToValidate = STEP_ONE_FIELDS;
    } else if (currentStep === 2) {
      fieldsToValidate = STEP_TWO_FIELDS;
    }

    const isValid = await form.trigger(fieldsToValidate);
    const areConditionalsValid = currentStep !== 1 || validateStepOneConditionalFields();
    if (isValid && areConditionalsValid) setCurrentStep((s) => s + 1);
    else scrollToFirstError();
  };

  /** Sends the user back to the step that owns the first error — its field must be mounted
   *  for `scrollToFirstError` to reach it. */
  const handleInvalidSubmit = (errors: FieldErrors<ContractFormValues>) => {
    setHasSubmitError(true);
    const stepOfFirstError = STEP_ONE_FIELDS.some((field) => field in errors) ? 1 : 2;
    setCurrentStep(stepOfFirstError);
    requestAnimationFrame(() => scrollToFirstError());
  };

  return (
    <div className="flex flex-col gap-6">
      {(copyFromLabel || isEdit) && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="text-warning size-4" />
          <AlertDescription className="text-muted-foreground text-xs">
            {copyFromLabel
              ? `${copyFromLabel} の内容をコピーしました。${
                  isChildCreate ? `親主契約に「${sourceName ?? ''}」を設定しています。` : ''
                }コードは必ず変更してください。`
              : '料金や条件を変更すると、現在この契約プランに加入中の会員にも反映されます。'}
          </AlertDescription>
        </Alert>
      )}

      <Stepper currentStep={currentStep} />

      {hasSubmitError && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertDescription className="text-xs">
            入力内容に不備があります。未入力の必須項目を確認してください。
          </AlertDescription>
        </Alert>
      )}

      {/* 複製 creates a new master, so the id field stays 「保存後に自動採番」— the source is
          shown as コピー元ID on step 2 instead. */}
      {currentStep === 1 && (
        <ContractFormBasicInfo
          planCode={planCode}
          planId={planId}
          isEdit={isEdit}
          areImmutablesLocked={isEdit || isCopy}
          isChildCreate={isChildCreate}
          corporateName={corporateName}
          thumbnailPreviews={thumbnailPreviews}
          uploadThumbnail={uploadThumbnail}
          onThumbnailUploadingChange={setIsThumbnailUploading}
          onAreasDropped={setAreaRemovedNotice}
        />
      )}
      {currentStep === 2 && (
        <ContractFormPricingConditions
          copiedFromLabel={copyFromLabel}
          isChildCreate={isChildCreate}
          onLeave={onLeave}
          areaRemovedNotice={areaRemovedNotice}
          onAreaRemovedNoticeClear={() => setAreaRemovedNotice('')}
        />
      )}
      {currentStep === 3 && <ContractFormConfirmation planCode={planCode} isEdit={isEdit} />}

      <div className="flex items-center justify-between border-t p-4">
        <Button size="lg" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <div className="flex items-center gap-2">
          <Button
            size="lg"
            variant="outline"
            disabled={currentStep === 1 || isBusy}
            onClick={() => setCurrentStep((s) => s - 1)}
          >
            前のステップ
          </Button>
          {currentStep < 3 ? (
            <Button size="lg" onClick={handleNext} disabled={isBusy}>
              次のステップ
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={form.handleSubmit(
                onSubmit as (values: ContractFormValues) => void,
                handleInvalidSubmit,
              )}
              disabled={isBusy}
            >
              {isEdit ? '変更を保存する' : '登録する'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
