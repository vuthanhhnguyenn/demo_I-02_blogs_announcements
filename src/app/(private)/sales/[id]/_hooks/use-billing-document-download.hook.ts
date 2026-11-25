'use client';

import { useRef } from 'react';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { AdminWriteOff__AccountingApi119 } from '@/lib/api-real';

export type BillingDocumentRequest =
  | { type: 'receipt'; billingItemId: string }
  | { type: 'invoice'; billingId: string };

const DOCUMENT_LABELS: Record<BillingDocumentRequest['type'], string> = {
  receipt: '領収書',
  invoice: '請求書',
};

/**
 * FR-009 領収書 / 請求書 PDF — API-119 §12 `GET receipts/{billingItemId}`, §13
 * `GET invoices/{billingId}`. Called on click (a mutation, so the 15-minute signed URL is never
 * served from the query cache and a failure — E-RCP-001 / E-RCP-003 — goes through the shared
 * `MutationCache` error toast). One receipt covers every billing its payment settled.
 *
 * The tab is opened in the click itself and pointed at the PDF once the URL arrives: a
 * `window.open` after the `await` is no longer a user gesture and Safari blocks it.
 */
export function useBillingDocumentDownload() {
  const tabRef = useRef<Window | null>(null);

  const mutation = useMutation({
    mutationFn: async (request: BillingDocumentRequest) => {
      if (request.type === 'receipt') {
        const { data } =
          await AdminWriteOff__AccountingApi119.adminWriteoffAccountingControllerReceipt({
            path: { billingItemId: request.billingItemId },
            throwOnError: true,
          });
        return { type: request.type, pdfUrl: data.pdfUrl };
      }
      const { data } =
        await AdminWriteOff__AccountingApi119.adminWriteoffAccountingControllerInvoice({
          path: { billingId: request.billingId },
          throwOnError: true,
        });
      return { type: request.type, pdfUrl: data.pdfUrl };
    },
    onSuccess: ({ type, pdfUrl }) => {
      const tab = tabRef.current;
      if (tab && !tab.closed) tab.location.href = pdfUrl;
      else window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      toast.success(`${DOCUMENT_LABELS[type]}をダウンロードしました`);
    },
    onError: () => tabRef.current?.close(),
    onSettled: () => {
      tabRef.current = null;
    },
  });

  const mutate = (request: BillingDocumentRequest) => {
    const tab = window.open('', '_blank');
    // Opened without `noopener` so the handle is usable — cut the back-reference by hand
    if (tab) tab.opener = null;
    tabRef.current = tab;
    mutation.mutate(request);
  };

  return { ...mutation, mutate };
}
