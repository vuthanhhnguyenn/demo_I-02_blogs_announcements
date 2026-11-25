'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { type FormMode, TAB_META, type TabKey } from '../_constants/constants';
import {
  type ExerciseMasterFormSubmitValues,
  type ExerciseMasterFormValues,
  getExerciseMasterFormSchema,
} from '../_schemas/exercise-master-form.schema';

interface ExerciseMasterFormDialogProps {
  open: boolean;
  mode: FormMode;
  kind: TabKey;
  isSubmitting: boolean;
  initialValues: ExerciseMasterFormValues;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ExerciseMasterFormSubmitValues) => void;
  /** Server-side error on コード (409 E-EXM-008), shown under the field. */
  codeError?: string | null;
}

export function ExerciseMasterFormDialog({
  open,
  mode,
  kind,
  isSubmitting,
  initialValues,
  onOpenChange,
  onSubmit,
  codeError,
}: ExerciseMasterFormDialogProps) {
  const form = useForm<ExerciseMasterFormValues, unknown, ExerciseMasterFormSubmitValues>({
    resolver: zodResolver(getExerciseMasterFormSchema(kind)) as never,
    mode: 'onChange',
    defaultValues: initialValues,
  });

  const { label, nameLabel, nameFieldLabel, codePlaceholder, descriptionRequired } = TAB_META[kind];
  const title = mode === 'create' ? `${label}を新規登録` : `${label}を編集`;
  const requiredLabel = <span className="text-destructive ml-1">*</span>;

  useEffect(() => {
    if (open) {
      form.reset(initialValues);
      return;
    }

    form.reset(initialValues);
  }, [form, initialValues, open]);

  useEffect(() => {
    if (codeError) form.setError('code', { type: 'server', message: codeError });
  }, [codeError, form]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
      }}
    >
      {/* Capped to the viewport: the fields scroll, the header and footer stay visible (long 説明). */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? `${label}のコード・${nameLabel}・説明・表示順を登録します。`
              : `${label}の${nameLabel}・説明・表示順を更新します。`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            noValidate
            className="flex min-h-0 flex-col gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="-mx-1 grid min-h-0 gap-4 overflow-y-auto px-1 pb-1">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>コード{mode === 'create' && requiredLabel}</FormLabel>
                    {mode === 'create' ? (
                      <>
                        <FormControl>
                          <Input placeholder={codePlaceholder} {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </>
                    ) : (
                      <p className="text-muted-foreground bg-muted/30 rounded-lg border px-3 py-2 text-sm [overflow-wrap:anywhere]">
                        {field.value}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {nameFieldLabel}
                      {requiredLabel}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={`${nameLabel}を入力`} {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>説明{descriptionRequired && requiredLabel}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={descriptionRequired ? '説明文を入力' : '説明文（任意）'}
                        className="max-h-48 overflow-y-auto [overflow-wrap:anywhere]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>表示順{requiredLabel}</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} step={1} {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={mode === 'create' ? 'bg-black text-white hover:bg-black/90' : undefined}
              >
                {mode === 'create' ? '登録する' : '変更を保存する'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
