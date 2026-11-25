'use client';

import { useForm, useWatch } from 'react-hook-form';

import { CampaignGenderConflictDialog } from '@/app/(private)/campaigns/_components/campaign-gender-conflict-dialog';
import { useCampaignGenderConflict } from '@/app/(private)/campaigns/_hooks/use-campaign-gender-conflict';
import { zodResolver } from '@hookform/resolvers/zod';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useSingleSubmit } from '@/hooks/use-single-submit.hook';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes.hook';

import { RequiredMark } from '@/components/common/field-marker';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { getApiErrorCode } from '@/lib/api-error.util';
import {
  adminAreaControllerCreateMutation,
  adminAreaControllerDetailQueryKey,
  adminAreaControllerListQueryKey,
  adminAreaControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { AreaDetailDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import {
  AREA_BRAND_GROUPS,
  AREA_BRAND_GROUP_ITEMS,
  AREA_GENDER_CONDITIONS,
  AREA_GENDER_CONDITION_LABELS,
  AREA_NAME_MAX_LENGTH,
  AREA_NOTE_MAX_LENGTH,
  AREA_NOT_FOUND_ERROR_CODE,
  AREA_SAVE_MUTATION_KEY,
  type AreaBrandGroup,
  areaGenderChangeNote,
  isAreaUsed,
} from '../_constants/area.constants';
import {
  type AreaFormInput,
  type AreaFormValues,
  areaFormSchema,
} from '../_schemas/area-form.schema';
import { invalidateAreaReaderCaches } from '../_utils/area-cache.util';
import { AreaReadRow } from './area-read-row';

type AreaFormProps = Readonly<
  | {
      mode: 'create';
      /** The brand pre-selected on 登録 (the list's brand filter, or none). */
      initialBrand: AreaBrandGroup | null;
      onCancel: () => void;
      onSaved: (areaId: string) => void;
    }
  | {
      mode: 'edit';
      area: AreaDetailDto;
      onCancel: () => void;
      onSaved: (areaId: string) => void;
      /** The area was deleted elsewhere while it was being edited (E-ARE-001). */
      onGone: () => void;
    }
>;

function toFormInput(props: AreaFormProps): AreaFormInput {
  if (props.mode === 'edit') {
    const { area } = props;
    return {
      brandGroup: area.brandGroup as AreaBrandGroup,
      name: area.name,
      genderCondition: area.genderCondition,
      note: area.note ?? '',
    };
  }
  return {
    brandGroup: props.initialBrand ?? undefined,
    name: '',
    genderCondition: undefined,
    note: '',
  };
}

async function invalidateAreaQueries(queryClient: QueryClient, areaId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminAreaControllerListQueryKey() }),
    queryClient.invalidateQueries({
      queryKey: adminAreaControllerDetailQueryKey({ path: { areaId } }),
    }),
  ]);
}

/**
 * E-02 FR-016 — the register / edit form of the area sheet (body + footer). The sheet mounts a
 * fresh instance each time it enters a form, so a discarded entry never comes back.
 */
export function AreaForm(props: AreaFormProps) {
  const { mode, onCancel, onSaved } = props;
  const area = props.mode === 'edit' ? props.area : null;
  const queryClient = useQueryClient();

  const form = useForm<AreaFormInput, unknown, AreaFormValues>({
    resolver: zodResolver(areaFormSchema) as never,
    defaultValues: toFormInput(props),
  });
  const { confirmDiscard } = useUnsavedChanges(form.formState.isDirty);
  const { tryStart, release } = useSingleSubmit();

  const createMutation = useMutation({
    ...adminAreaControllerCreateMutation(),
    mutationKey: AREA_SAVE_MUTATION_KEY,
    onSuccess: async (created) => {
      await invalidateAreaQueries(queryClient, created.id);
      form.reset(form.getValues());
      toast.success('エリアを登録しました');
      onSaved(created.id);
    },
    onError: release,
  });

  const genderConflict = useCampaignGenderConflict();
  const updateMutation = useMutation({
    ...adminAreaControllerUpdateMutation(),
    mutationKey: AREA_SAVE_MUTATION_KEY,
    // E-ARE-004: an accepting campaign auto-grants an option on this area and the new 性別の条件
    // would no longer admit its members, so the error names those campaigns in a dialog.
    meta: { suppressErrorToast: true },
    onSuccess: async (updated) => {
      await invalidateAreaQueries(queryClient, updated.id);
      // Its name / 性別の条件 is shown on devices, plans, options and the sale candidates.
      invalidateAreaReaderCaches(queryClient);
      form.reset(form.getValues());
      toast.success('エリアの変更を保存しました');
      onSaved(updated.id);
    },
    onError: (error) => {
      release();
      genderConflict.handleError(error);
      if (props.mode !== 'edit' || getApiErrorCode(error) !== AREA_NOT_FOUND_ERROR_CODE) return;
      // Deleted elsewhere: drop the stale record and close the sheet — the toast above already
      // carries the API message, and the refetched list no longer holds the row.
      form.reset(form.getValues());
      queryClient.removeQueries({
        queryKey: adminAreaControllerDetailQueryKey({ path: { areaId: props.area.id } }),
      });
      void queryClient.invalidateQueries({ queryKey: adminAreaControllerListQueryKey() });
      props.onGone();
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: AreaFormValues) => {
    if (!tryStart()) return;
    const note = values.note || null;
    if (area) {
      updateMutation.mutate({
        path: { areaId: area.id },
        body: { name: values.name, genderCondition: values.genderCondition, note },
      });
      return;
    }
    createMutation.mutate({
      body: {
        brandGroup: values.brandGroup,
        name: values.name,
        genderCondition: values.genderCondition,
        note,
      },
    });
  };

  const genderCondition = useWatch({ control: form.control, name: 'genderCondition' });
  const genderChangeNote =
    area &&
    isAreaUsed(area.usageCounts) &&
    genderCondition !== undefined &&
    genderCondition !== area.genderCondition
      ? areaGenderChangeNote(area.usageCounts)
      : null;

  return (
    <Form {...form}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex-1 overflow-y-auto px-6">
          <div className="flex flex-col gap-4 py-4">
            {area ? (
              <AreaReadRow label="ブランド">
                <div className="flex flex-col gap-1">
                  <span>{area.brandGroup}</span>
                  <p className="text-muted-foreground text-xs">登録後は変更できません</p>
                </div>
              </AreaReadRow>
            ) : (
              <FormField
                control={form.control}
                name="brandGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      ブランド
                      <RequiredMark />
                    </FormLabel>
                    <Select
                      items={AREA_BRAND_GROUP_ITEMS}
                      value={field.value ?? null}
                      onValueChange={(v) =>
                        field.onChange((v as AreaBrandGroup | null) ?? undefined)
                      }
                    >
                      <FormControl>
                        <SelectTrigger ref={field.ref} className="w-full">
                          <SelectValue placeholder="ブランドを選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AREA_BRAND_GROUPS.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            <AreaReadRow label="エリアID">
              {area ? (
                area.areaCode
              ) : (
                <span className="text-muted-foreground">登録時に自動で採番されます</span>
              )}
            </AreaReadRow>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    エリア名
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例: 女性専用エリア"
                      maxLength={AREA_NAME_MAX_LENGTH}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="genderCondition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    性別の条件
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      ref={field.ref}
                      value={field.value ?? null}
                      onValueChange={field.onChange}
                      className="flex items-center gap-6 pt-1"
                    >
                      {AREA_GENDER_CONDITIONS.map((g) => (
                        <div key={g} className="flex items-center gap-2">
                          <RadioGroupItem value={g} id={`area-gender-${g}`} />
                          <Label
                            htmlFor={`area-gender-${g}`}
                            className="cursor-pointer text-sm font-normal"
                          >
                            {AREA_GENDER_CONDITION_LABELS[g]}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="text-xs" />
                  {genderChangeNote && (
                    <p className="text-warning flex items-start gap-1 text-xs">
                      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                      {genderChangeNote}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">備考</FormLabel>
                  <FormControl>
                    <Textarea rows={3} maxLength={AREA_NOTE_MAX_LENGTH} {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => confirmDiscard(onCancel)}
            disabled={isSaving}
          >
            キャンセル
          </Button>
          <RoleGatedButton
            requiredPermission={mode === 'create' ? Permission.AreasCreate : Permission.AreasEdit}
            type="submit"
            disabled={isSaving}
          >
            {mode === 'create' ? '登録する' : '変更を保存する'}
          </RoleGatedButton>
        </div>
      </form>
      <CampaignGenderConflictDialog
        conflict={genderConflict.conflict}
        onClose={genderConflict.close}
      />
    </Form>
  );
}
