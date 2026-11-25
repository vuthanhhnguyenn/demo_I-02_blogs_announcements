'use client';
import { toSelectItems } from '@/utils/app.util';

import { DateTimePicker } from '@/components/common/date-time-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import type { ApplicationProxyDto } from '@/lib/api-real/types.gen';

/** 合意方法 as every proxy-filing DTO takes it (`ApplicationProxyDto` / `ProxyApplicationDto`). */
export type ProxyAgreementMethod = ApplicationProxyDto['agreementMethod'];

const PROXY_METHOD_OPTIONS: { value: ProxyAgreementMethod; label: string }[] = [
  { value: 'in_person', label: '来店' },
  { value: 'phone', label: '電話' },
  { value: 'email', label: 'メール' },
  { value: 'line', label: 'LINE' },
];

const PROXY_METHOD_ITEMS = toSelectItems(PROXY_METHOD_OPTIONS);

interface ProxyAgreementFieldsProps {
  agreedAt: Date | undefined;
  onAgreedAtChange: (v: Date | undefined) => void;
  method: ProxyAgreementMethod | '';
  onMethodChange: (v: ProxyAgreementMethod | '') => void;
  agreedAtError?: string;
  /** Only ever set by the `alwaysProxy` callers — 合意方法 is optional behind the switch. */
  methodError?: string;
}

export type ProxyApplicationSectionProps = ProxyAgreementFieldsProps &
  (
    | {
        /**
         * The operation is a proxy filing by definition — the CRM cannot file it as the member
         * themselves (API-094 §6.2 rejects `crm_direct`), so there is no switch to turn off and
         * 合意方法 is required alongside 合意日時.
         */
        alwaysProxy: true;
        isProxy?: never;
        onIsProxyChange?: never;
      }
    | {
        alwaysProxy?: false;
        isProxy: boolean;
        onIsProxyChange: (v: boolean) => void;
      }
  );

export function ProxyApplicationSection(props: Readonly<ProxyApplicationSectionProps>) {
  const { agreedAt, onAgreedAtChange, method, onMethodChange, agreedAtError, methodError } = props;
  const isProxy = props.alwaysProxy === true ? true : props.isProxy;

  return (
    <div className="flex flex-col gap-3 rounded-md border px-4 py-3">
      <div className="flex items-center justify-between">
        {props.alwaysProxy === true ? (
          <Label className="text-sm font-medium">代理申請記録</Label>
        ) : (
          <>
            <Label htmlFor="proxy-switch" className="cursor-pointer text-sm font-medium">
              スタッフが代理申請する
            </Label>
            <Switch
              id="proxy-switch"
              checked={props.isProxy}
              onCheckedChange={props.onIsProxyChange}
            />
          </>
        )}
      </div>

      {isProxy && (
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs">
              合意日時 <span className="text-destructive ml-0.5">*</span>
            </Label>
            <DateTimePicker
              value={agreedAt}
              onChange={onAgreedAtChange}
              placeholder="日時を選択"
              hasError={!!agreedAtError}
            />
            {agreedAtError && <p className="text-destructive text-xs">{agreedAtError}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="proxy-method" className="text-muted-foreground text-xs">
              合意方法
              {props.alwaysProxy === true && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            <Select
              value={method}
              onValueChange={(v) => onMethodChange((v ?? '') as ProxyAgreementMethod | '')}
              items={PROXY_METHOD_ITEMS}
            >
              <SelectTrigger
                id="proxy-method"
                className={`h-9 text-sm ${methodError ? 'border-destructive' : ''}`}
                aria-invalid={!!methodError || undefined}
              >
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {PROXY_METHOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {methodError && <p className="text-destructive text-xs">{methodError}</p>}
          </div>

          {/* A-01 FR-017: the staff member is recorded from the operation log, not typed in */}
          {props.alwaysProxy === true && (
            <p className="text-muted-foreground text-xs">
              代理申請者は操作ログから自動記録されます。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
