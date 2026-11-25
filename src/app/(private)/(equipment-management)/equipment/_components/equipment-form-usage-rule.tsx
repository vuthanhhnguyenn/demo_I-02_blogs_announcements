'use client';

import { useFormContext, useFormState, useWatch } from 'react-hook-form';

import { AlertTriangle } from 'lucide-react';

import { RequiredMark } from '@/components/common/field-marker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import {
  EQUIPMENT_MAIN_CONTRACT_TYPE_LABELS,
  EQUIPMENT_SERVICE_TYPE_VALUES,
  JOYFIT_ONLY_MAIN_CONTRACT_TYPES,
  MAIN_CONTRACT_ALL_LABEL,
  MAIN_CONTRACT_ALL_NOTE,
  OPTION_BYPASS_ALERT,
  getSelectableMainContractTypes,
  getServiceTypeLabel,
  hasAllSelectableMainContractTypes,
} from '../_constants/constants';
import { useControllerBrandGroup } from '../_hooks/use-store-brand-group';
import {
  type EquipmentFormValues,
  type MainContractScope,
  isAreaDoor,
} from '../_schemas/equipment-form.schema';
import { EquipmentFormAreaDoor } from './equipment-form-area-door';

/**
 * 利用制御ルール (E-02 FR-008, prototype 11/7): two judgment axes — 主契約判定 (「全て」 or one or
 * more 主契約タイプ, OR) and サービス種別判定 (one or more G-02 service types, OR). 課金種別
 * (通常/都度) is deliberately not an axis: any active option of the same service type permits
 * start-up, whatever it bills as.
 */
type EquipmentFormUsageRuleProps = {
  areaClearedByBrand?: boolean;
  onAreaPicked?: () => void;
};

export function EquipmentFormUsageRule({
  areaClearedByBrand = false,
  onAreaPicked = () => undefined,
}: EquipmentFormUsageRuleProps = {}) {
  const form = useFormContext<EquipmentFormValues>();
  const { errors, isSubmitted } = useFormState({ control: form.control });

  const [mainEnabled, mainScope, mainTypes, serviceEnabled, equipmentType, controllerId] = useWatch(
    {
      control: form.control,
      name: [
        'usage_control_rule.main_enabled',
        'usage_control_rule.main_scope',
        'usage_control_rule.main_contract_types',
        'usage_control_rule.service_enabled',
        'equipment_type',
        'controller_id',
      ],
    },
  );
  const isGate = equipmentType === 'entry_gate';

  // The brand of the controller's store decides the selectable types; with no controller picked
  // there is no brand, so the type checkboxes wait for one (prototype).
  const { brandGroup, isLoading: isBrandLoading } = useControllerBrandGroup(controllerId || null);
  const selectableTypes = getSelectableMainContractTypes(brandGroup);

  // 「全て」, or every selectable type ticked, together with サービス種別判定 never looks at the
  // option: a member with a main contract alone can start the device. Saving is not blocked.
  const showOptionBypassAlert =
    mainEnabled &&
    serviceEnabled &&
    (mainScope === 'all' ||
      (mainScope === 'specified' && hasAllSelectableMainContractTypes(mainTypes, brandGroup)));

  // FR-008 異常系 sits on the rule object itself, so it renders above both judgments rather
  // than under either checkbox.
  const ruleError = errors.usage_control_rule?.message;

  /**
   * The rule errors live on the rule object, and RHF's post-submit re-validation only re-checks
   * the field that changed — so the 「どちらかを設定してください」 error stayed up after ticking a
   * judgment until the next submit (BUG-E02-C-03). Re-run the whole object once a submit was
   * attempted.
   */
  const revalidateRule = () => {
    if (isSubmitted) void form.trigger('usage_control_rule');
  };

  // E-02 FR-003 / FR-008 (prototype 11/12): an エリア扉 is judged by its one area, not by a rule.
  if (isAreaDoor(equipmentType)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">利用制御ルール</CardTitle>
          <p className="text-muted-foreground mt-1 text-xs">
            扉の先のエリアを1つ選択してください。このエリアを利用できる主契約またはオプションを持つ会員が開錠できます。
          </p>
        </CardHeader>
        <CardContent className="px-6">
          <EquipmentFormAreaDoor
            areaClearedByBrand={areaClearedByBrand}
            onAreaPicked={onAreaPicked}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">利用制御ルール</CardTitle>
        <p className="text-muted-foreground mt-1 text-xs">
          起動を許可する条件を1つ以上設定してください。両方を設定すると、どちらか一方を満たせば起動します。
        </p>
      </CardHeader>
      <CardContent className="px-6">
        {/* aria-invalid (not role="group", which does not support it) is what the
            scroll-to-first-error hook keys off when neither judgment is selected. */}
        <div className="space-y-4" aria-invalid={Boolean(ruleError)}>
          {ruleError ? (
            <p className="text-destructive text-xs" role="alert">
              {ruleError}
            </p>
          ) : null}

          {/* 主契約判定 */}
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="usage_control_rule.main_enabled"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      id="rule-main"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        field.onChange(isChecked);
                        if (!isChecked) {
                          form.setValue('usage_control_rule.main_scope', '', { shouldDirty: true });
                          form.setValue('usage_control_rule.main_contract_types', [], {
                            shouldDirty: true,
                          });
                        }
                        revalidateRule();
                      }}
                    />
                  </FormControl>
                  <Label htmlFor="rule-main" className="cursor-pointer text-sm font-medium">
                    主契約判定
                  </Label>
                  {!mainEnabled ? (
                    <span className="text-muted-foreground text-xs">主契約では判定しません</span>
                  ) : null}
                </div>
              )}
            />
            {mainEnabled ? (
              <div className="ml-6 space-y-3">
                <FormField
                  control={form.control}
                  name="usage_control_rule.main_scope"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        対象の主契約タイプ
                        <RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value as MainContractScope);
                            revalidateRule();
                          }}
                          aria-invalid={Boolean(fieldState.error)}
                          className="flex items-center gap-6 pt-1"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="all" id="main-scope-all" />
                            <Label
                              htmlFor="main-scope-all"
                              className="cursor-pointer text-sm font-normal"
                            >
                              {MAIN_CONTRACT_ALL_LABEL}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="specified" id="main-scope-specified" />
                            <Label
                              htmlFor="main-scope-specified"
                              className="cursor-pointer text-sm font-normal"
                            >
                              タイプを指定
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      {field.value === 'all' ? (
                        <p className="text-muted-foreground text-xs">{MAIN_CONTRACT_ALL_NOTE}</p>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {mainScope === 'specified' ? (
                  <FormField
                    control={form.control}
                    name="usage_control_rule.main_contract_types"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>
                          主契約タイプ（複数選択可）
                          <RequiredMark />
                        </FormLabel>
                        {!controllerId ? (
                          <p className="text-muted-foreground text-xs">
                            先に接続先接点制御装置を選択してください。店舗のブランドで選べるタイプが決まります
                          </p>
                        ) : isBrandLoading ? (
                          <p className="text-muted-foreground text-xs">読み込み中...</p>
                        ) : (
                          <>
                            <FormControl>
                              <div
                                className="grid max-w-lg grid-cols-3 gap-x-6 gap-y-2 pt-1"
                                aria-invalid={Boolean(fieldState.error)}
                              >
                                {selectableTypes.map((type) => (
                                  <div key={type} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`main-type-${type}`}
                                      checked={field.value.includes(type)}
                                      className={
                                        fieldState.error ? 'border-destructive' : undefined
                                      }
                                      onCheckedChange={(checked) => {
                                        field.onChange(
                                          checked === true
                                            ? [...field.value, type]
                                            : field.value.filter((value) => value !== type),
                                        );
                                        revalidateRule();
                                      }}
                                    />
                                    <Label
                                      htmlFor={`main-type-${type}`}
                                      className="cursor-pointer text-sm font-normal"
                                    >
                                      {EQUIPMENT_MAIN_CONTRACT_TYPE_LABELS[type]}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </FormControl>
                            <p className="text-muted-foreground text-xs">
                              選んだタイプのいずれかが有効なら起動します
                            </p>
                            {brandGroup === 'FIT365' ? (
                              <p className="text-muted-foreground text-xs">
                                FIT365 の店舗の機器のため、JOYFIT 専用のタイプ（
                                {JOYFIT_ONLY_MAIN_CONTRACT_TYPES.map(
                                  (type) => EQUIPMENT_MAIN_CONTRACT_TYPE_LABELS[type],
                                ).join('・')}
                                ）は表示していません
                              </p>
                            ) : null}
                          </>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          {/* サービス種別判定 */}
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="usage_control_rule.service_enabled"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      id="rule-service"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        field.onChange(isChecked);
                        if (!isChecked) {
                          form.setValue('usage_control_rule.service_types', [], {
                            shouldDirty: true,
                          });
                        }
                        revalidateRule();
                      }}
                    />
                  </FormControl>
                  <Label htmlFor="rule-service" className="cursor-pointer text-sm font-medium">
                    サービス種別判定
                  </Label>
                  {!serviceEnabled ? (
                    <span className="text-muted-foreground text-xs">
                      サービス種別では判定しません
                    </span>
                  ) : null}
                </div>
              )}
            />
            {serviceEnabled ? (
              <div className="ml-6">
                <FormField
                  control={form.control}
                  name="usage_control_rule.service_types"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        サービス種別（複数選択可）
                        <RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1" role="group">
                          {EQUIPMENT_SERVICE_TYPE_VALUES.map((option) => (
                            <div key={option} className="flex items-center gap-2">
                              <Checkbox
                                id={`service-type-${option}`}
                                checked={field.value.includes(option)}
                                className={fieldState.error ? 'border-destructive' : undefined}
                                onCheckedChange={(checked) => {
                                  field.onChange(
                                    checked === true
                                      ? [...field.value, option]
                                      : field.value.filter((value) => value !== option),
                                  );
                                  revalidateRule();
                                }}
                              />
                              <Label
                                htmlFor={`service-type-${option}`}
                                className="cursor-pointer text-sm font-normal"
                              >
                                {getServiceTypeLabel(option)}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <p className="text-muted-foreground text-xs">
                        課金種別（通常/都度）は問いません。同じサービス種別のオプションが複数ある場合、いずれか1つが有効であれば起動を許可します
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}
          </div>

          {/* 「全て」または全部指定＋サービス種別判定の知らせ（保存は止めない） */}
          {showOptionBypassAlert ? (
            <Alert className="border-warning/50 bg-warning/15">
              <AlertTriangle className="text-warning size-4" />
              <AlertTitle className="text-xs">{OPTION_BYPASS_ALERT.title}</AlertTitle>
              <AlertDescription className="text-muted-foreground text-xs">
                {OPTION_BYPASS_ALERT.body}
              </AlertDescription>
            </Alert>
          ) : null}

          {/* ゲートストップ条件（入館ゲートのみ・表示のみ） */}
          {isGate ? (
            <div className="bg-info/15 border-info/20 rounded-md border px-4 py-3">
              <p className="text-info text-xs font-medium">
                入館ゲートのゲートストップ条件（自動適用）
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                以下の条件に該当する会員はゲートストップが自動適用されます: ① ブラックリスト登録済み
                ② 未納（滞納） ③ 家族会員利用中
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
