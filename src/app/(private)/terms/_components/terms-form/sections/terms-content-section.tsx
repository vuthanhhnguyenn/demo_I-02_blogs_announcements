'use client';

import type { ChangeEvent, RefObject } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { TermsBodyPreview } from '@/app/(private)/terms/_components/terms-body-preview';
import { TermsPdfUploadField } from '@/app/(private)/terms/_components/terms-form/sections/terms-pdf-upload-field';
import {
  TERMS_STATUS_TONES,
  TERMS_TIMELINE_STATUS_LABELS,
  type TermsVersionKind,
  VERSION_KIND_LABELS,
} from '@/app/(private)/terms/_constants/constants';
import type { TermsFormValues } from '@/app/(private)/terms/_schemas/terms-form.schema';
import { sortVersionsNewestFirst } from '@/app/(private)/terms/_utils/terms-versions.util';
import { formatDate } from '@/utils/format.util';

import { OptionalMark } from '@/components/common/field-marker';
import { ToneBadge } from '@/components/common/tone-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { TermsRelatedVersionDto } from '@/lib/api-real/types.gen';

export interface RelatedLineage {
  originalId: string;
  versions: TermsRelatedVersionDto[];
}

interface TermsContentSectionProps {
  pdfInputRef: RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  hasExistingPdf: boolean;
  showExistingFileChip: boolean;
  existingPdfFileName?: string;
  /** File whose extracted text is shown (the prior file until a replacement is chosen). */
  attachedPdfName?: string;
  /** File chosen in the picker (empty in replace mode until a valid replacement is chosen). */
  selectedPdfName?: string;
  onReplaceClick: () => void;
  onCancelReplace: () => void;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  /** The chosen PDF was untagged, so the 規約本文 blocks were inferred from its layout. */
  isBodyInferred: boolean;
  /**
   * The document's lineage (Y-04 用語定義「関連規約」): in edit mode itself excluded, in
   * new-version mode the source's whole lineage.
   */
  relatedLineage?: RelatedLineage | null;
}

function RelatedVersionsList({ lineage }: Readonly<{ lineage: RelatedLineage }>) {
  const kindOf = (id: string): TermsVersionKind =>
    id === lineage.originalId ? 'original' : 'version';

  return (
    <ul className="flex max-w-160 flex-col gap-2">
      {sortVersionsNewestFirst(lineage.versions).map((version) => (
        <li
          key={version.id}
          className="bg-muted/30 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
        >
          <span className="text-xs font-medium">{version.version}</span>
          <Badge variant="outline">{VERSION_KIND_LABELS[kindOf(version.id)]}</Badge>
          <ToneBadge tone={TERMS_STATUS_TONES[version.status]}>
            {TERMS_TIMELINE_STATUS_LABELS[version.status]}
          </ToneBadge>
          <span className="text-muted-foreground ml-auto text-[10px]">
            {formatDate(version.effectiveFrom)} 〜{' '}
            {version.effectiveTo ? formatDate(version.effectiveTo) : '現在'}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TermsContentSection({
  pdfInputRef,
  isUploading,
  hasExistingPdf,
  showExistingFileChip,
  existingPdfFileName,
  attachedPdfName,
  selectedPdfName,
  onReplaceClick,
  onCancelReplace,
  onFileSelect,
  isBodyInferred,
  relatedLineage,
}: Readonly<TermsContentSectionProps>) {
  const form = useFormContext<TermsFormValues>();
  const bodyText = useWatch({ control: form.control, name: 'bodyText' });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">内容</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-4">
        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">
                備考
                <OptionalMark />
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="規約に関する備考を入力"
                  rows={4}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <TermsPdfUploadField
          pdfInputRef={pdfInputRef}
          isUploading={isUploading}
          hasExistingPdf={hasExistingPdf}
          showExistingFileChip={showExistingFileChip}
          existingPdfFileName={existingPdfFileName}
          attachedPdfName={selectedPdfName}
          onReplaceClick={onReplaceClick}
          onCancelReplace={onCancelReplace}
          onFileSelect={onFileSelect}
        />

        <div className="flex flex-col gap-2">
          <Label className="text-sm">規約本文</Label>
          <p className="text-muted-foreground text-xs">
            PDFアップロード時にテキストを自動抽出し、規約本文テキストとして保持します
          </p>
          {attachedPdfName ? (
            <div className="flex flex-col gap-2">
              <TermsBodyPreview bodyText={bodyText} className="h-80 max-w-160" />
              <p className="text-muted-foreground text-[10px]">抽出元: {attachedPdfName}</p>
              {isBodyInferred && (
                <p className="text-muted-foreground text-xs">
                  このPDFには文書構造（タグ）が含まれていないため、段落・字下げをレイアウトから推定しました。表示内容をご確認ください。Wordの「名前を付けて保存」でPDFを書き出すと、より正確に抽出できます
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              PDFファイルを選択すると、本文テキストが自動抽出されて表示されます
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-sm">関連規約</Label>
          {relatedLineage ? (
            <RelatedVersionsList lineage={relatedLineage} />
          ) : (
            <p className="text-muted-foreground text-sm">関連する規約が存在しません</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
