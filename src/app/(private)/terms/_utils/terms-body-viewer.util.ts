/**
 * The page the app's WebView shows for a terms `bodyText` — a copy of the backend's
 * `toTermsViewerContent` (fitness-backend-v2 bff legacy-fitness-terms.dto.ts), so the CRM preview
 * matches the app:
 *  - the markup fragment `<div data-font="serif|sans">…</div>` gets the viewer shell,
 *  - anything else — plain text (bodies stored before the fragment existed), or any other markup,
 *    `account_terms` included since every type is managed here — is escaped into a `<pre>`.
 * It is always rendered in a sandboxed iframe, so no script in it can run.
 */

const FRAGMENT_PREFIX = '<div data-font="';
const SANS_STACK =
  '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Noto Sans CJK JP",sans-serif';
const SERIF_STACK =
  '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP","Noto Serif CJK JP",serif';
const HEAD =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

export function toTermsViewerDocument(bodyText: string | null | undefined): string {
  const body = (bodyText ?? '').trim();
  if (body.startsWith(FRAGMENT_PREFIX)) {
    return [
      HEAD,
      `<style>body{margin:0;padding:16px;line-height:1.7;word-break:break-word;font-family:${SANS_STACK}}`,
      `[data-font=serif]{font-family:${SERIF_STACK}}p{margin:0 0 .35em}</style>`,
      body,
    ].join('');
  }
  return [
    HEAD,
    '<style>body{margin:0;padding:16px;font-family:sans-serif;line-height:1.6}',
    'pre{white-space:pre-wrap;word-break:break-word;font:inherit;margin:0}</style>',
    `<pre>${body ? escapeHtml(body) : '—'}</pre>`,
  ].join('');
}
