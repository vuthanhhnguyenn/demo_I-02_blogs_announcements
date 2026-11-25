'use client';
// Client component: Quill touches `document`, so it is loaded with `ssr: false` and edited in the browser.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type ReactQuill from 'react-quill-new';
import type { DeltaStatic, EmitterSource, Quill, RangeStatic } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

import dynamic from 'next/dynamic';

import { toSelectItems } from '@/utils/app.util';
import { Bold, ImageIcon, Italic, Link, List } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';

import { cn } from '@/lib/utils';

import {
  BLOG_BODY_HEADING_OPTIONS,
  BLOG_BODY_PLACEHOLDER,
  BLOG_BODY_QUILL_FORMATS,
} from '../../../_constants/blog.constants';

type QuillWrapperProps = React.ComponentProps<typeof ReactQuill> & {
  forwardedRef: React.Ref<ReactQuill>;
};

const ReactQuillEditor = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill-new');

    function QuillWrapper({ forwardedRef, ...props }: QuillWrapperProps) {
      return <RQ ref={forwardedRef} {...props} />;
    }

    return QuillWrapper;
  },
  { ssr: false },
);

/** Images the editor accepts — toolbar, drop and paste (same PNG / JPG limit as the thumbnail). */
const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'];
const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(',');

const HEADING_SELECT_ITEMS = toSelectItems(BLOG_BODY_HEADING_OPTIONS);

type ActiveFormats = {
  header: string;
  bold: boolean;
  italic: boolean;
  list: boolean;
  link: boolean;
};

const INITIAL_FORMATS: ActiveFormats = {
  header: 'normal',
  bold: false,
  italic: false,
  list: false,
  link: false,
};

/** The snow theme's link tooltip (BaseTooltip#edit); not on Quill's public `Theme` type. */
type SnowThemeWithTooltip = {
  tooltip?: { edit: (mode?: string, preview?: string | null) => void };
};

/**
 * Uploads each file (the upload callback checks type / size) and embeds the returned URLs from
 * `index` on, so no image ever lands in the body as base64.
 */
async function uploadAndEmbed(
  quill: Quill,
  index: number,
  files: readonly File[],
  upload: (file: File) => Promise<string | null>,
) {
  let at = index;
  for (const file of files) {
    const url = await upload(file);
    if (!url) continue;
    quill.insertEmbed(at, 'image', url, 'user');
    at += 1;
  }
  if (at > index) quill.setSelection(at, 0, 'user');
}

/*
 * One bordered box: shadcn toolbar row + Quill container (prototype L242-L272). quill.snow.css is
 * unlayered and outranks Tailwind's utilities layer, hence `!` on what it also sets.
 */
const EDITOR_CLASSES = cn(
  'min-w-0 rounded-md border aria-invalid:border-destructive',
  '[&_.ql-container.ql-snow]:border-0!',
  // editor area ≈ 16 rows (prototype Textarea rows={16})
  '[&_.ql-editor]:min-h-[320px] [&_.ql-editor]:text-sm [&_.ql-editor]:wrap-anywhere!',
);

interface BlogBodyEditorProps {
  /** HTML string of the body (RHF `field.value`). */
  value: string;
  /** `source` tells user edits (`user`) apart from Quill normalising a loaded value (`api`). */
  onChange: (value: string, source: EmitterSource) => void;
  onBlur?: () => void;
  /** Turns the border destructive (`aria-invalid` on the wrapper; Quill takes no aria props). */
  hasError?: boolean;
  /**
   * Uploads an image picked from the toolbar / dropped / pasted and resolves to its URL (null on
   * failure), so the body never carries base64 images.
   */
  onImageUpload?: (file: File) => Promise<string | null>;
}

/**
 * 本文 rich-text editor (prototype blog-form.tsx L241-L273); wrap it in the 本文 field. The toolbar
 * is built from shadcn controls and drives Quill through its ref (pattern of lessons'
 * lesson-form-description).
 */
export function BlogBodyEditor({
  value,
  onChange,
  onBlur,
  hasError = false,
  onImageUpload,
}: Readonly<BlogBodyEditorProps>) {
  const quillRef = useRef<ReactQuill | null>(null);
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(INITIAL_FORMATS);
  // Quill's toolbar module only hosts the snow theme's link tooltip: it is bound to an empty,
  // hidden container (by selector, resolved when Quill mounts) so no Quill controls render.
  const tooltipHostId = `blog-body-quill-${useId().replace(/[^\w-]/g, '')}`;

  // Quill re-initialises when `modules` changes identity, so handlers read the latest upload
  // callback through a ref and the modules object is created once.
  const onImageUploadRef = useRef(onImageUpload);
  useEffect(() => {
    onImageUploadRef.current = onImageUpload;
  }, [onImageUpload]);

  const syncActiveFormats = useCallback(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    // getFormat() without a range focuses the editor; read the selection explicitly and skip the
    // sync while unfocused so blurring (or the initial setContents) can't steal focus.
    const range = editor.getSelection();
    if (!range) return;
    const current = editor.getFormat(range);
    setActiveFormats({
      header: current.header ? String(current.header) : 'normal',
      bold: Boolean(current.bold),
      italic: Boolean(current.italic),
      list: current.list === 'bullet',
      link: Boolean(current.link),
    });
  }, []);

  /** Focuses the editor (restoring its last selection) and returns it with that selection. */
  const focusEditor = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return null;
    editor.focus();
    return { editor, range: editor.getSelection() ?? { index: 0, length: 0 } };
  };

  const toggleInline = (format: 'bold' | 'italic') => {
    const focused = focusEditor();
    if (!focused) return;
    const { editor, range } = focused;
    editor.format(format, !editor.getFormat(range)[format], 'user');
    syncActiveFormats();
  };

  const toggleBulletList = () => {
    const focused = focusEditor();
    if (!focused) return;
    const { editor, range } = focused;
    editor.format('list', editor.getFormat(range).list === 'bullet' ? false : 'bullet', 'user');
    syncActiveFormats();
  };

  const applyHeading = (next: string | null) => {
    const focused = focusEditor();
    if (!focused || !next) return;
    focused.editor.format('header', next === 'normal' ? false : Number(next), 'user');
    syncActiveFormats();
  };

  /** Same as Quill snow's link handler: unlink, or open the URL tooltip for the selected text. */
  const toggleLink = () => {
    const focused = focusEditor();
    if (!focused) return;
    const { editor, range } = focused;
    if (editor.getFormat(range).link) {
      editor.format('link', false, 'user');
      syncActiveFormats();
      return;
    }
    if (range.length === 0) return;
    (editor.theme as SnowThemeWithTooltip).tooltip?.edit('link', editor.getText(range));
  };

  const pickImage = () => {
    const focused = focusEditor();
    const upload = onImageUploadRef.current;
    if (!focused || !upload) return;
    const { editor, range } = focused;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = IMAGE_ACCEPT;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      await uploadAndEmbed(editor, range.index, [file], upload);
    };
    input.click();
  };

  const modules = useMemo(
    () => ({
      toolbar: { container: `#${tooltipHostId}` },
      // Dropped / pasted image files: Quill's default uploader would embed them as base64.
      uploader: {
        mimetypes: IMAGE_MIME_TYPES,
        handler(this: { quill: Quill }, range: RangeStatic, files: File[]) {
          const upload = onImageUploadRef.current;
          if (!upload) return;
          void uploadAndEmbed(this.quill, range.index, files, upload);
        },
      },
      // Pasted HTML carrying inline `data:` images is dropped (only uploaded URLs are kept).
      clipboard: {
        matchers: [
          [
            'img',
            (node: Node, delta: DeltaStatic) =>
              node instanceof HTMLImageElement && node.getAttribute('src')?.startsWith('data:')
                ? delta.slice(0, 0)
                : delta,
          ],
        ],
      },
    }),
    [tooltipHostId],
  );

  return (
    <div
      className={EDITOR_CLASSES}
      aria-invalid={hasError || undefined}
      onCompositionStart={(event) => {
        const root = event.currentTarget.querySelector<HTMLElement>('.ql-editor');
        if (root) root.dataset.placeholder = '';
      }}
      onCompositionEnd={(event) => {
        const root = event.currentTarget.querySelector<HTMLElement>('.ql-editor');
        if (root) root.dataset.placeholder = BLOG_BODY_PLACEHOLDER;
      }}
    >
      {/* Editor toolbar (prototype L244-L262) */}
      <div className="bg-muted/30 flex items-center gap-1 border-b px-2 py-1">
        <Select
          items={HEADING_SELECT_ITEMS}
          value={activeFormats.header}
          onValueChange={applyHeading}
        >
          <SelectTrigger
            aria-label="段落スタイル"
            className="h-8 w-[100px] border-0 bg-transparent text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BLOG_BODY_HEADING_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <Toggle
          size="sm"
          className="size-8 p-0"
          aria-label="太字"
          pressed={activeFormats.bold}
          onPressedChange={() => toggleInline('bold')}
        >
          <Bold className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          className="size-8 p-0"
          aria-label="斜体"
          pressed={activeFormats.italic}
          onPressedChange={() => toggleInline('italic')}
        >
          <Italic className="size-4" />
        </Toggle>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <Toggle
          size="sm"
          className="size-8 p-0"
          aria-label="箇条書き"
          pressed={activeFormats.list}
          onPressedChange={toggleBulletList}
        >
          <List className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          className="size-8 p-0"
          aria-label="リンク"
          pressed={activeFormats.link}
          onPressedChange={toggleLink}
        >
          <Link className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          className="size-8 p-0"
          aria-label="画像"
          pressed={false}
          onPressedChange={pickImage}
        >
          <ImageIcon className="size-4" />
        </Toggle>
      </div>
      <div id={tooltipHostId} hidden />
      <ReactQuillEditor
        forwardedRef={quillRef}
        theme="snow"
        placeholder={BLOG_BODY_PLACEHOLDER}
        modules={modules}
        formats={BLOG_BODY_QUILL_FORMATS}
        value={value}
        onChange={(next: string, _delta: unknown, source: EmitterSource) => {
          onChange(next, source);
          syncActiveFormats();
        }}
        onBlur={onBlur}
        onChangeSelection={syncActiveFormats}
      />
    </div>
  );
}
