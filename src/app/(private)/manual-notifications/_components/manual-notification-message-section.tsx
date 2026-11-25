'use client';

import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type ReactQuill from 'react-quill-new';

import dynamic from 'next/dynamic';

import { TEXTAREA_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/constants/app.constants';

import { RequiredMark } from '@/components/common/field-marker';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import type { GetCrmNotificationsFormConfigResponse } from '@/lib/api/types.gen';

import { Permission } from '@/types/permission.type';

import {
  MANUAL_NOTIFICATION_CHANNEL_LABELS,
  MANUAL_NOTIFICATION_CHANNEL_OPTIONS,
  type ManualNotificationChannel,
} from '../_constants/manual-notification.constants';
import type { ManualNotificationFormValues } from '../_schemas/manual-notification-form.schema';

type QuillProps = React.ComponentProps<typeof ReactQuill>;
const RichTextEditor = dynamic(
  async () => {
    const { default: Editor } = await import('react-quill-new');
    return function EmailEditor(props: QuillProps) {
      return <Editor {...props} />;
    };
  },
  { ssr: false },
);

export function ManualNotificationMessageSection({
  templates,
  activeChannel,
  onActiveChannelChange,
}: {
  readonly templates: GetCrmNotificationsFormConfigResponse['templates'];
  readonly activeChannel: ManualNotificationChannel;
  readonly onActiveChannelChange: (channel: ManualNotificationChannel) => void;
}) {
  const form = useFormContext<ManualNotificationFormValues>();
  const channels = useWatch({ control: form.control, name: 'channels' });
  const contentErrors = form.formState.errors.contents;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
  const channelHasError = (channel: ManualNotificationChannel) => Boolean(contentErrors?.[channel]);

  const applyTemplate = (id: string | null) => {
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    setSelectedTemplateId(template.id);
    const { body } = template;
    const currentContents = form.getValues('contents');
    const enabledChannels = form.getValues('channels');
    form.setValue(
      'contents',
      {
        sms: enabledChannels.includes('sms') ? { body } : currentContents.sms,
        push: enabledChannels.includes('push')
          ? { ...currentContents.push, body }
          : currentContents.push,
        email: enabledChannels.includes('email')
          ? { ...currentContents.email, body }
          : currentContents.email,
        in_app: enabledChannels.includes('in_app')
          ? { ...currentContents.in_app, body }
          : currentContents.in_app,
      },
      { shouldDirty: true, shouldValidate: true },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">チャネル別文言</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedTemplateId ?? ''} onValueChange={applyTemplate}>
              <SelectTrigger className="bg-background h-8 w-52 text-xs">
                <SelectValue placeholder="テンプレートから選択（任意）">
                  {selectedTemplate?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <RoleGatedButton
              type="button"
              variant="link"
              size="sm"
              className="px-0 text-xs"
              requiredPermission={Permission.ManualNotificationsEdit}
              disabled
              tooltip="後日対応予定"
            >
              管理 →
            </RoleGatedButton>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4">
        <Tabs
          value={activeChannel}
          onValueChange={(value) => onActiveChannelChange(value as ManualNotificationChannel)}
        >
          <TabsList>
            {MANUAL_NOTIFICATION_CHANNEL_OPTIONS.map((channel) => (
              <TabsTrigger key={channel} value={channel} className="gap-1 text-xs">
                {MANUAL_NOTIFICATION_CHANNEL_LABELS[channel]}
                {channelHasError(channel) ? (
                  <span className="bg-destructive size-1.5 rounded-full" aria-label="入力エラー" />
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {!channels.includes(activeChannel) ? (
          <p className="text-muted-foreground bg-muted/30 rounded-md border px-3 py-2 text-xs">
            {MANUAL_NOTIFICATION_CHANNEL_LABELS[activeChannel]}
            チャネルが無効です。チャネルを有効にすると編集できます。
          </p>
        ) : null}
        <ChannelContentFields channel={activeChannel} enabled={channels.includes(activeChannel)} />
      </CardContent>
    </Card>
  );
}

function ChannelContentFields({
  channel,
  enabled,
}: {
  readonly channel: ManualNotificationChannel;
  readonly enabled: boolean;
}) {
  const form = useFormContext<ManualNotificationFormValues>();
  const title = useWatch({ control: form.control, name: 'title' });
  const bodyName = `contents.${channel}.body` as const;
  const bodyLabel = channel === 'sms' ? 'SMS本文' : channel === 'email' ? '本文' : '通知本文';
  return (
    <div className="space-y-4">
      {channel !== 'sms' ? (
        <p className="text-muted-foreground text-xs">
          タイトル（基本情報で入力）: {title.trim() || '未入力'}
        </p>
      ) : null}
      <FormField
        control={form.control}
        name={bodyName}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>
                {bodyLabel} {enabled ? <RequiredMark /> : null}
              </FormLabel>
              {channel === 'sms' ? (
                <Badge
                  variant={[...(field.value ?? '')].length > 70 ? 'destructive' : 'outline'}
                  className="text-xs tabular-nums"
                >
                  {[...(field.value ?? '')].length}/70文字目安
                </Badge>
              ) : null}
            </div>
            <FormControl>
              {channel === 'email' ? (
                // ReactQuill's rich-text editor has no `maxLength` prop — the
                // 10 000-char limit is enforced server-side via zod
                // (ManualNotificationContentsSchema.email.body) and on the
                // クライアント form schema. The editor keeps growing while
                // typing; we only guard it on submit.
                <div className="[&_.ql-container]:border-input [&_.ql-container]:rounded-lg [&_.ql-container]:border [&_.ql-editor]:min-h-[160px] [&_.ql-editor]:text-sm">
                  <RichTextEditor
                    theme="snow"
                    value={field.value}
                    onChange={field.onChange}
                    readOnly={!enabled}
                    modules={{ toolbar: [['bold', 'italic', 'underline'], [{ list: 'bullet' }]] }}
                    formats={['bold', 'italic', 'underline', 'list']}
                    placeholder="メール本文を入力してください..."
                  />
                </div>
              ) : (
                <Textarea
                  {...field}
                  rows={channel === 'sms' ? 4 : 6}
                  placeholder={
                    channel === 'sms'
                      ? '例: 【JOYFIT】夏キャンペーン開催中！詳しくはアプリをご確認ください。'
                      : channel === 'push'
                        ? '例: 7月末まで入会金無料！この機会をお見逃しなく。'
                        : '例: 7月末まで入会金無料！詳細はこちらからご確認ください。'
                  }
                  className="min-h-28 resize-y"
                  maxLength={channel === 'sms' ? 670 : TEXTAREA_MAX_LENGTH}
                  disabled={!enabled}
                />
              )}
            </FormControl>
            {channel === 'sms' ? (
              <FormDescription>
                全角70文字以内を推奨（超過時は複数通送信になります）
              </FormDescription>
            ) : null}
            {enabled ? <FormMessage /> : null}
          </FormItem>
        )}
      />
      {channel === 'in_app' ? (
        <FormField
          control={form.control}
          name="contents.in_app.linkUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>リンクURL</FormLabel>
              <FormDescription>タップ時の遷移先URL（任意）</FormDescription>
              <FormControl>
                <Input
                  {...field}
                  placeholder="https://..."
                  className="max-w-[480px]"
                  maxLength={TEXT_MAX_LENGTH}
                  disabled={!enabled}
                />
              </FormControl>
              {enabled ? <FormMessage /> : null}
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
}
