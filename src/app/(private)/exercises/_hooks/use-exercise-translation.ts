'use client';

import { createContext, useContext, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { toast } from 'sonner';

import { EXERCISE_STEP_LABELS } from '../_constants/constants';
import type {
  ExerciseFormInput,
  ExerciseFormValues,
  ExerciseTranslationMeta,
} from '../_schemas/exercise-form.schema';
import {
  EXERCISE_TRANSLATABLE_FIELDS,
  type ExerciseTranslatableField,
  type ExerciseTranslationTexts,
  translateExerciseTexts,
} from '../_utils/exercise-translation.util';

type TranslationStatus = 'translating' | 'failed';
type ExerciseForm = UseFormReturn<ExerciseFormInput, unknown, ExerciseFormValues>;
type TextValues = Pick<ExerciseFormInput, 'nameJa' | 'nameEn' | 'explanationSteps'>;

function stepIndexOf(field: ExerciseTranslatableField) {
  return EXERCISE_STEP_LABELS.findIndex((step) => step.field === field);
}

export function getExerciseJaText(values: TextValues, field: ExerciseTranslatableField) {
  return field === 'name'
    ? (values.nameJa ?? '')
    : (values.explanationSteps?.[stepIndexOf(field)]?.textJa ?? '');
}

export function getExerciseEnText(values: TextValues, field: ExerciseTranslatableField) {
  return field === 'name'
    ? (values.nameEn ?? '')
    : (values.explanationSteps?.[stepIndexOf(field)]?.textEn ?? '');
}

export function getExerciseEnPath(field: ExerciseTranslatableField) {
  return field === 'name' ? 'nameEn' : (`explanationSteps.${stepIndexOf(field)}.textEn` as const);
}

export function getExerciseJaPath(field: ExerciseTranslatableField) {
  return field === 'name' ? 'nameJa' : (`explanationSteps.${stepIndexOf(field)}.textJa` as const);
}

/** FR-014: 要再翻訳 = EN exists and the JP changed since the EN was generated (D22). */
export function isExerciseTranslationStale(
  ja: string,
  en: string,
  meta: ExerciseTranslationMeta | undefined,
) {
  if (!ja.trim() || !en.trim() || !meta) return false;
  return meta.baseJa === null || meta.baseJa !== ja;
}

function retranslatedMessage(field: ExerciseTranslatableField) {
  return field === 'name'
    ? 'エクササイズ名（英語）を再生成しました'
    : `ステップ${stepIndexOf(field)}の英語版を再生成しました`;
}

/**
 * FR-014 translation flow shared by the basic and steps tabs: per-field status, 再翻訳 (with the
 * hand-edit confirm), and the save-time translation of JP-filled / EN-empty fields.
 */
export function useExerciseTranslation(form: ExerciseForm) {
  const [statuses, setStatuses] = useState<
    Partial<Record<ExerciseTranslatableField, TranslationStatus>>
  >({});
  const [confirmField, setConfirmField] = useState<ExerciseTranslatableField | null>(null);
  // The dialog also reports a close after 「上書き」; that close must not run the cancel branch.
  const confirmedRef = useRef(false);

  const setStatus = (fields: ExerciseTranslatableField[], status: TranslationStatus | null) =>
    setStatuses((current) => {
      const next = { ...current };
      for (const field of fields) {
        if (status) next[field] = status;
        else delete next[field];
      }
      return next;
    });

  /** Runs the translation; successful fields are written to the form as machine output. */
  async function translate(fields: ExerciseTranslatableField[]) {
    const values = form.getValues();
    const texts: ExerciseTranslationTexts = {};
    for (const field of fields) texts[field] = getExerciseJaText(values, field).trim();

    setStatus(fields, 'translating');
    let translated: ExerciseTranslationTexts = {};
    try {
      translated = await translateExerciseTexts(texts);
    } catch {
      // Spec 異常系: a failure never blocks the save; the field shows the retry state.
    }

    const failed = fields.filter((field) => !translated[field]);
    for (const field of fields) {
      const en = translated[field];
      if (!en) continue;
      form.setValue(getExerciseEnPath(field), en, { shouldDirty: true, shouldValidate: true });
      form.setValue(
        `translation.${field}`,
        { baseJa: getExerciseJaText(values, field), isManuallyEdited: false, isMachine: true },
        { shouldDirty: true },
      );
    }
    setStatus(
      fields.filter((field) => !failed.includes(field)),
      null,
    );
    setStatus(failed, 'failed');
    return { translated, failed };
  }

  async function retranslate(field: ExerciseTranslatableField, notify: boolean) {
    const { failed } = await translate([field]);
    if (notify && failed.length === 0) toast.success(retranslatedMessage(field));
  }

  /** 「再翻訳する」: a hand-edited EN asks first (FR-014). */
  function requestRetranslate(field: ExerciseTranslatableField) {
    if (form.getValues(`translation.${field}`)?.isManuallyEdited) {
      confirmedRef.current = false;
      setConfirmField(field);
      return;
    }
    void retranslate(field, true);
  }

  function confirmRetranslate() {
    if (!confirmField) return;
    const field = confirmField;
    confirmedRef.current = true;
    setConfirmField(null);
    void retranslate(field, true);
  }

  /** Cancel keeps the EN and clears the badge (the current JP becomes the baseline). */
  function cancelRetranslate() {
    if (confirmField && !confirmedRef.current) {
      form.setValue(
        `translation.${confirmField}.baseJa`,
        getExerciseJaText(form.getValues(), confirmField),
      );
    }
    setConfirmField(null);
  }

  /** A hand edit belongs to the JP shown at that moment (prototype behaviour). */
  function markEdited(field: ExerciseTranslatableField) {
    form.setValue(`translation.${field}`, {
      baseJa: getExerciseJaText(form.getValues(), field),
      isManuallyEdited: true,
      isMachine: false,
    });
    setStatus([field], null);
  }

  /**
   * Save-time translation (FR-014: on save, only JP-filled / EN-empty fields). Returns the values to
   * save with any translation applied, and whether a translation failed.
   */
  async function translateMissing(values: ExerciseFormValues) {
    const fields = EXERCISE_TRANSLATABLE_FIELDS.filter(
      (field) =>
        getExerciseJaText(values, field).trim().length > 0 &&
        getExerciseEnText(values, field).trim().length === 0,
    );
    if (fields.length === 0) return { values, hasFailure: false };

    const { translated, failed } = await translate(fields);
    const next: ExerciseFormValues = {
      ...values,
      explanationSteps: values.explanationSteps.map((step) => ({ ...step })),
      translation: { ...values.translation },
    };
    for (const field of fields) {
      const en = translated[field];
      if (!en) continue;
      if (field === 'name') next.nameEn = en;
      else next.explanationSteps[stepIndexOf(field)].textEn = en;
      next.translation[field] = {
        baseJa: getExerciseJaText(values, field),
        isManuallyEdited: false,
        isMachine: true,
      };
    }
    return { values: next, hasFailure: failed.length > 0 };
  }

  const isTranslating = Object.values(statuses).includes('translating');

  return {
    statuses,
    isTranslating,
    confirmField,
    requestRetranslate,
    retry: (field: ExerciseTranslatableField) => void retranslate(field, false),
    confirmRetranslate,
    cancelRetranslate,
    markEdited,
    translateMissing,
  };
}

export type ExerciseTranslationController = ReturnType<typeof useExerciseTranslation>;

export const ExerciseTranslationContext = createContext<ExerciseTranslationController | null>(null);

export function useExerciseTranslationContext() {
  const context = useContext(ExerciseTranslationContext);
  if (!context) {
    throw new Error('useExerciseTranslationContext must be used inside ExerciseForm');
  }
  return context;
}
