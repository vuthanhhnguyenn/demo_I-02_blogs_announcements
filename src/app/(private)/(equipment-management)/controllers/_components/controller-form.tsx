'use client';

import { useFormContext } from 'react-hook-form';

import { TEXT_MAX_LENGTH } from '@/constants/app.constants';
import { Info } from 'lucide-react';

import { RequiredMark } from '@/components/common/field-marker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { CONTROLLER_FORM_HELPER_TEXTS, CONTROLLER_STATUS_LABELS } from '../_constants/constants';
import {
  CONTROLLER_STATUS_VALUES,
  type ControllerFormValues,
  FIRMWARE_VERSION_MAX_LENGTH,
  RELAY_ID_MAX_LENGTH,
} from '../_schemas/controller-form.schema';
import { ControllerStoreField } from './controller-store-field';

type ControllerFormProps = {
  mode?: 'create' | 'edit';
  /** Label of the store the record already points at, for the 店舗コード trigger in edit mode. */
  initialStore?: { id: string; label: string };
};

export function ControllerForm({ mode = 'create', initialStore }: ControllerFormProps) {
  const form = useFormContext<ControllerFormValues>();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="px-6">
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            {/* 接点制御装置ID = the AWS IoT thing name: typed in on 新規登録, immutable afterwards
                (API-104 relayId; not accepted on PATCH). */}
            <FormField
              control={form.control}
              name="relayId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    接点制御装置ID
                    {mode === 'create' ? <RequiredMark /> : null}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例: yashio-rc_01"
                      maxLength={RELAY_ID_MAX_LENGTH}
                      className={mode === 'edit' ? 'bg-muted/30 font-mono' : 'font-mono'}
                      disabled={mode === 'edit'}
                      title={mode === 'edit' ? field.value : undefined}
                      {...field}
                    />
                  </FormControl>
                  {mode === 'create' ? (
                    <p className="text-muted-foreground text-xs">
                      変換器に設定した装置IDと同じ値を入力してください（登録後は変更できません）
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    装置名
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="装置名を入力" maxLength={TEXT_MAX_LENGTH} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="storeId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    店舗コード
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <ControllerStoreField
                      value={field.value}
                      onChange={field.onChange}
                      hasError={Boolean(fieldState.error)}
                      disabled={mode === 'edit'}
                      initialStore={initialStore}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    設置場所
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例: 受付室 機器ラック"
                      maxLength={TEXT_MAX_LENGTH}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Alert className="mt-4">
            <Info className="size-4" />
            <AlertDescription className="text-xs">
              接続情報は装置本体のラベルまたは管理画面（http://[IP]
              にブラウザでアクセス）で確認できます。不明な場合は本部または導入業者にお問い合わせください。
            </AlertDescription>
          </Alert>

          <div className="mt-4 grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="ipAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    IPアドレス
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="192.168.1.10" className="font-mono" {...field} />
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    {CONTROLLER_FORM_HELPER_TEXTS.ipAddress}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="firmwareVersion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ファームウェアバージョン</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例: v2.4.1"
                      className="font-mono"
                      maxLength={FIRMWARE_VERSION_MAX_LENGTH}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    {CONTROLLER_FORM_HELPER_TEXTS.firmwareVersion}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="controlPortCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    制御ポート数
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="8"
                      className="font-mono"
                      min={1}
                      max={64}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    {CONTROLLER_FORM_HELPER_TEXTS.controlPortCount}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">ステータス</CardTitle>
        </CardHeader>
        <CardContent className="px-6">
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    状態
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="状態を選択">
                          {field.value ? CONTROLLER_STATUS_LABELS[field.value] : '状態を選択'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {CONTROLLER_STATUS_VALUES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {CONTROLLER_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
