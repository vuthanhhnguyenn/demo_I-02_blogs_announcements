'use client';

import { type ChangeEvent, type ClipboardEvent } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { STAFF_BULK_INVITE_MAX_ROWS } from '@/constants/app.constants';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useEmailAvailability } from '../_hooks/use-email-availability.hook';
import type { StaffCreateFormValues } from '../_schemas/staff-create.schema';
import {
  ROW_DUPLICATE_MESSAGES,
  buildPastedRows,
  getRowDuplicateStatus,
  parsePastedEmailLines,
} from '../_utils/staff-create.util';

const ROW_FIELDS = ['last_name', 'first_name', 'email'] as const;
type RowField = (typeof ROW_FIELDS)[number];

interface StaffRowsSectionProps {
  /**
   * Fired after a row is removed. Removing the only row the user had added brings the
   * form's values back to their defaults, which is exactly what react-hook-form's
   * `isDirty` measures — so the page latches this instead to keep guarding the exit.
   */
  onRowRemoved?: () => void;
}

export function StaffRowsSection({ onRowRemoved }: StaffRowsSectionProps = {}) {
  const form = useFormContext<StaffCreateFormValues>();
  const { unavailableEmails, checkEmail } = useEmailAvailability();
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'rows',
  });
  const rows = useWatch({ control: form.control, name: 'rows' });
  const filledRowCount = rows.filter(
    (row) => row.last_name.trim() || row.first_name.trim() || row.email.trim(),
  ).length;

  // One bulk invitation accepts at most STAFF_BULK_INVITE_MAX_ROWS rows
  // (`InviteStaffBulkRequestDto.staff` maxItems) — stop before the request would 400.
  const atRowLimit = fields.length >= STAFF_BULK_INVITE_MAX_ROWS;

  function handleAddRow() {
    if (atRowLimit) return;
    append({ last_name: '', first_name: '', email: '' });
  }

  function handleRemoveRow(index: number) {
    remove(index);
    onRowRemoved?.();
  }

  /**
   * Whether a row is validated depends on its sibling cells (a blank added row is skipped),
   * but in `onChange` mode react-hook-form only refreshes the error of the cell that
   * changed — clearing 姓 last left 名's error stale, or vice versa (Y-01 Bug No.8).
   * Re-run only the siblings that already show an error, so an error never goes stale but
   * a cell the user has not touched never gets one. (Not `isDirty`: inside a field array
   * react-hook-form marks the whole row dirty, which flagged untouched siblings.)
   */
  async function handleCellChange(
    index: number,
    key: RowField,
    onChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void | boolean>,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    await onChange(event);
    const siblings = ROW_FIELDS.filter((field) => field !== key)
      .map((field) => `rows.${index}.${field}` as const)
      .filter((name) => Boolean(form.getFieldState(name, form.formState).error));
    if (siblings.length > 0) void form.trigger(siblings);
  }

  function handleEmailPaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const emailLines = parsePastedEmailLines(event.clipboardData.getData('text'));
    if (emailLines.length <= 1) return;
    event.preventDefault();
    const { rows: pastedRows, droppedCount } = buildPastedRows(
      form.getValues('rows'),
      index,
      emailLines,
    );
    if (pastedRows.length === 0) return;
    replace(pastedRows);
    if (droppedCount > 0) {
      toast.warning(
        `一度に登録できるのは${STAFF_BULK_INVITE_MAX_ROWS}名までです。${droppedCount}件は取り込まれませんでした`,
      );
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-4 py-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">基本情報</CardTitle>
          {filledRowCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {filledRowCount}名入力中
            </Badge>
          )}
        </div>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[160px] text-xs font-semibold first:pl-4">
              姓<span className="text-destructive ml-0.5">*</span>
            </TableHead>
            <TableHead className="w-[160px] text-xs font-semibold">
              名<span className="text-destructive ml-0.5">*</span>
            </TableHead>
            <TableHead className="text-xs font-semibold">
              メールアドレス<span className="text-destructive ml-0.5">*</span>
            </TableHead>
            <TableHead className="w-10 text-xs font-semibold last:pr-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => {
            const dup = getRowDuplicateStatus(rows, index, unavailableEmails);
            const rowErrors = form.formState.errors.rows?.[index];
            const lastNameField = form.register(`rows.${index}.last_name`);
            const firstNameField = form.register(`rows.${index}.first_name`);
            const emailField = form.register(`rows.${index}.email`);
            return (
              <TableRow key={field.id}>
                <TableCell className="py-2 first:pl-4">
                  <Input
                    placeholder="例: 田中"
                    className="h-8 text-sm"
                    aria-invalid={!!rowErrors?.last_name}
                    {...lastNameField}
                    onChange={(event) =>
                      handleCellChange(index, 'last_name', lastNameField.onChange, event)
                    }
                  />
                  {rowErrors?.last_name && (
                    <p className="text-destructive mt-1 text-xs">{rowErrors.last_name.message}</p>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <Input
                    placeholder="例: 太郎"
                    className="h-8 text-sm"
                    aria-invalid={!!rowErrors?.first_name}
                    {...firstNameField}
                    onChange={(event) =>
                      handleCellChange(index, 'first_name', firstNameField.onChange, event)
                    }
                  />
                  {rowErrors?.first_name && (
                    <p className="text-destructive mt-1 text-xs">{rowErrors.first_name.message}</p>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <Input
                    type="email"
                    placeholder="例: tanaka@joyfit.co.jp"
                    className="h-8 text-sm"
                    aria-invalid={!!rowErrors?.email || dup !== null}
                    onPaste={(e) => handleEmailPaste(index, e)}
                    {...emailField}
                    onChange={(event) =>
                      handleCellChange(index, 'email', emailField.onChange, event)
                    }
                    // Ask the availability endpoint once the user leaves the field, on top of
                    // the register handler that runs validation.
                    onBlur={(event) => {
                      void emailField.onBlur(event);
                      checkEmail(event.target.value);
                    }}
                  />
                  {/* One message slot, not three. The blur-time advisory and the field
                      error the submit's 409 sets say the same sentence, and rendering both
                      printed 「すでに登録されています」 twice under the same input
                      (BUG-P2-02-13). The field error wins — it is the authoritative one. */}
                  {rowErrors?.email ? (
                    <p className="text-destructive mt-1 text-xs">{rowErrors.email.message}</p>
                  ) : dup ? (
                    <p className="text-destructive mt-1 text-xs">{ROW_DUPLICATE_MESSAGES[dup]}</p>
                  ) : null}
                </TableCell>
                <TableCell className="py-2 last:pr-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                    disabled={fields.length === 1}
                    onClick={() => handleRemoveRow(index)}
                  >
                    <X className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="border-t px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1 text-sm"
          disabled={atRowLimit}
          onClick={handleAddRow}
        >
          <Plus className="size-4" />
          スタッフを追加
        </Button>
        {atRowLimit && (
          <p className="text-muted-foreground mt-2 text-xs">
            一度に登録できるのは{STAFF_BULK_INVITE_MAX_ROWS}名までです。
          </p>
        )}
      </div>
    </Card>
  );
}
