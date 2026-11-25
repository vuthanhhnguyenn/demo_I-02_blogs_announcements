'use client';

import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';

import { Button, buttonVariants } from '@/components/ui/button';

import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
};

/**
 * The 設定を解除 confirmation opened from inside the 1DayPass price drawer.
 *
 * Built on Radix rather than the app's `@/components/ui/alert-dialog` (Base UI) on purpose
 * (BUG-U6-05). The drawer is vaul, i.e. a modal `@radix-ui/react-dialog`: while it is open, Radix's
 * `DismissableLayer` sets `body { pointer-events: none }` and re-enables pointer events only on the
 * Radix layers it tracks, and its `FocusScope` traps focus inside the drawer. A Base UI dialog
 * portalled to `<body>` is not one of those layers, so it inherited `pointer-events: none` — a real
 * pointer fell through to the drawer/backdrop and only a programmatic `.click()` reached the
 * buttons. A Radix AlertDialog joins the same (single, deduped) layer and focus-scope stacks as
 * vaul's dialog: it becomes the top layer with pointer events, the drawer's outside-click dismissal
 * and focus trap pause underneath it, and Escape closes only the dialog.
 *
 * Keep it rendered as a React sibling of the `<Drawer>`, not inside `DrawerContent`, so pointer
 * events from the dialog never bubble into vaul's drag handlers.
 */
export function OneDayPassClearConfirmDialog({ open, onOpenChange, isPending, onConfirm }: Props) {
  return (
    <AlertDialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        // A clear in flight is not abandoned by Escape — the result decides when it closes
        if (!nextOpen && isPending) return;
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          data-slot="alert-dialog-overlay"
          className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs"
        />
        <AlertDialogPrimitive.Content
          data-slot="alert-dialog-content"
          className="bg-popover text-popover-foreground ring-foreground/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 fixed top-1/2 left-1/2 z-50 grid w-full max-w-xs -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl p-4 ring-1 duration-100 outline-none sm:max-w-sm"
        >
          <div className="grid gap-1.5 text-center sm:text-left">
            <AlertDialogPrimitive.Title className="font-heading text-base font-medium">
              選択した日の価格設定を解除しますか？
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-muted-foreground text-sm text-balance md:text-pretty">
              選択した日の価格設定を解除します。以降これらの日は基準価格で販売されます。
            </AlertDialogPrimitive.Description>
          </div>
          <div className="bg-muted/50 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t p-4 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel
              disabled={isPending}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              キャンセル
            </AlertDialogPrimitive.Cancel>
            {/* Not `AlertDialogPrimitive.Action`: that closes on click, before the deletes finish */}
            <Button type="button" variant="destructive" disabled={isPending} onClick={onConfirm}>
              解除する
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
