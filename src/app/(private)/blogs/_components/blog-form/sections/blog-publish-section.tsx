import { DateTimePicker } from '@/components/common/date-time-picker';
import { FormField } from '@/components/common/form-field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import type { BlogPublishMethod, BlogPublishMethodOption } from '../../../_types/blog.type';

interface BlogPublishSectionProps {
  /** Radio options in display order — create: now/scheduled/draft; edit of 非公開 adds keepUnpublished first (research F6). */
  options: readonly BlogPublishMethodOption[];
  publishMethod: BlogPublishMethod;
  onPublishMethodChange: (method: BlogPublishMethod) => void;
  publishAt: Date | undefined;
  onPublishAtChange: (date: Date | undefined) => void;
  publishEndDate: Date | undefined;
  onPublishEndDateChange: (date: Date | undefined) => void;
  /** Error messages (from RHF `formState.errors.<field>.message`). */
  errors?: {
    publishAt?: string;
    publishEndDate?: string;
  };
}

/** Card 「公開設定」 (prototype blog-form.tsx L489-L543). */
export function BlogPublishSection({
  options,
  publishMethod,
  onPublishMethodChange,
  publishAt,
  onPublishAtChange,
  publishEndDate,
  onPublishEndDateChange,
  errors,
}: Readonly<BlogPublishSectionProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">公開設定</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-6">
          <FormField label="公開方法" required>
            <RadioGroup
              value={publishMethod}
              onValueChange={(value) => {
                const option = options.find((item) => item.value === value);
                if (option) onPublishMethodChange(option.value);
              }}
            >
              <div className="flex flex-col gap-3">
                {options.map((option) => {
                  const id = `blog-publish-${option.value}`;
                  return (
                    <div key={option.value} className="flex items-center gap-3">
                      <RadioGroupItem value={option.value} id={id} />
                      <Label htmlFor={id} className="cursor-pointer text-sm">
                        {option.label}
                      </Label>
                      <span className="text-muted-foreground text-xs">{option.description}</span>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </FormField>

          {publishMethod === 'scheduled' && (
            <FormField
              label="公開日時"
              required
              description="保存後、設定した日時に自動公開されます"
              error={errors?.publishAt}
            >
              <div className="max-w-[400px]">
                <DateTimePicker
                  value={publishAt}
                  onChange={onPublishAtChange}
                  hasError={!!errors?.publishAt}
                />
              </div>
            </FormField>
          )}

          <FormField
            label="掲載終了日"
            description="設定した日に自動的に非公開になります（任意）"
            error={errors?.publishEndDate}
          >
            <DatePicker
              date={publishEndDate}
              onDateChange={onPublishEndDateChange}
              hasError={!!errors?.publishEndDate}
              placeholder="日付を選択"
              clearable
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  );
}
