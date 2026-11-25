'use client';

/**
 * DisabledReasonButton
 *
 * A Button that, when disabled, always explains why in a Tooltip (cross-screen UI rule:
 * a disabled button carries its reason). When enabled it is a plain Button.
 *
 * ```tsx
 * <DisabledReasonButton disabled={!!reason} disabledReason={reason} onClick={submit}>
 *   入会登録
 * </DisabledReasonButton>
 * ```
 */
import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

interface DisabledReasonButtonProps extends ComponentProps<typeof Button> {
  /** Shown in a Tooltip while the button is disabled. */
  disabledReason?: string;
  children: ReactNode;
}

export function DisabledReasonButton({
  disabled,
  disabledReason,
  className,
  children,
  ...props
}: Readonly<DisabledReasonButtonProps>) {
  if (!disabled || !disabledReason) {
    return (
      <Button disabled={disabled} className={className} {...props}>
        {children}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        {/* span wrapper is required because a disabled button swallows pointer events; it is
            focusable so keyboard users can reach the reason too (a disabled button is skipped). */}
        <TooltipTrigger
          render={
            <span
              tabIndex={0}
              className="focus-visible:ring-ring/50 inline-flex cursor-not-allowed rounded-lg outline-none focus-visible:ring-3"
            />
          }
        >
          <Button
            {...props}
            disabled
            aria-disabled="true"
            className={cn('pointer-events-none', className)}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{disabledReason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
