'use client';

import { useFormContext } from 'react-hook-form';

import { Shuffle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import type { LockerContractDetailDto } from '@/lib/api-real/types.gen';

import type { LockerContractFormValues } from '../_schemas/locker-contract-form.schema';
import { isDialLockContract } from '../_utils/locker-contract-form.util';

type LockerContractPasswordSectionProps = {
  contract: LockerContractDetailDto;
};

export function LockerContractPasswordSection({ contract }: LockerContractPasswordSectionProps) {
  const form = useFormContext<LockerContractFormValues>();

  // E-LOC-007: only dial locks carry a PIN
  if (!isDialLockContract(contract)) {
    return null;
  }

  const generatePin = () => {
    form.setValue('pinCode', String(Math.floor(1000 + Math.random() * 9000)), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">暗証番号管理</CardTitle>
      </CardHeader>
      <CardContent className="px-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="pinCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  暗証番号<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Input
                      className="h-8 font-mono"
                      maxLength={4}
                      placeholder="4桁の数字"
                      value={field.value ?? ''}
                      onChange={(event) =>
                        field.onChange(event.target.value.replace(/\D/g, '').slice(0, 4))
                      }
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={generatePin}
                  >
                    <Shuffle className="size-4" />
                    ランダム生成
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
