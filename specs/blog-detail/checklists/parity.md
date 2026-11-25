# UI Parity Checklist: Blog Detail (ブログ詳細)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `fitness-crm-ui/src/pages/blog-detail.tsx`@47d60ac (as recorded in spec.md header). Variants: `published`, `scheduled`, `draft`, `unpublished`, `deleted`, `sync-excluded` (published + WEB off).
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

## Page header

- [x] PAR001 Back link "ブログ管理に戻る" returning to the blog list — src: blog-detail.tsx:L128-L130
- [x] PAR002 Title = article title; subtitle = article number `BL-YYYY-NNNN` — src: blog-detail.tsx:L131-L132
- [x] PAR003 Status badge (outline, text-xs, font-medium, leading 1.5 dot): 公開予定 info, 非公開 muted, 下書き muted, 削除済み destructive, 公開中 success — src: blog-detail.tsx:L80-L106, L133
- [x] PAR004 Non-deleted actions in order: 削除 (outline, Trash2, destructive text) · プレビュー (outline, Eye) · 編集 (outline, Pencil) — src: blog-detail.tsx:L154-L200
- [x] PAR005 プレビュー hidden for 下書き — src: blog-detail.tsx:L182-L188
- [ ] PAR006 削除 enabled for Headquarter / System / Manager; otherwise disabled with tooltip "削除権限がありません" — src: blog-detail.tsx:L156-L165 — ⏸ Deferred: Blocked (2026-11-13 Chrome run): only a Headquarter session is available (Cognito, no role switch). As HQ 削除 is enabled; the disabled state and the 削除権限がありません tooltip for other roles were not observed
- [ ] PAR007 編集 enabled for Headquarter / System / Manager, and Staff when author; denied tooltip "自分が作成した記事のみ編集・公開切替できます" (Staff non-author) or "編集・公開切替の権限がありません" (others) — src: blog-detail.tsx:L108-L118, L190-L199 — ⏸ Deferred: Blocked (2026-11-13 Chrome run): HQ session only. As HQ 編集 is enabled; Staff author/non-author and Observer tooltips were not observed
- [x] PAR008 Deleted actions in order: 完全削除 (outline, XCircle, destructive text; HQ / System / Manager, tooltip "削除権限がありません") · 復元する (outline, RotateCcw) — src: blog-detail.tsx:L135-L152 — spec deviation: 完全削除 NOT built (Clarification Q1 = B) — verify it is absent; 復元する gated HQ / System / Manager (inherited Q2, V0 ungated)

## Layout

- [x] PAR009 Two columns: left 60% (cards stacked, gap-4), right 40% with sticky top inner column — src: blog-detail.tsx:L207-L209, L329-L330
- [x] PAR010 Main area scrolls under the fixed page header (px-6 py-4) — src: blog-detail.tsx:L123-L126, L205

## 基本情報 card

- [x] PAR011 Card title "基本情報"; fields in order タイトル (text-sm font-medium), カテゴリ (outline badge), サムネイル画像 (max-w-[320px] aspect-video rounded-lg bordered image) — src: blog-detail.tsx:L211-L234
- [x] PAR012 No 種別 field — src: blog-detail.tsx:L217

## 本文 card

- [x] PAR013 Card title "本文"; body rendered text-sm leading-relaxed with paragraph spacing (space-y-4) and emphasized headings — src: blog-detail.tsx:L237-L263

## 配信対象 card

- [x] PAR014 Card title "配信対象"; 2-column grid: 配信スコープ (secondary badge), 対象ブランド (outline badge), 対象店舗 (text-sm muted "全店舗" or store names) — src: blog-detail.tsx:L266-L287

## 公開設定 card

- [x] PAR015 Card title "公開設定"; 2-column grid: 公開ステータス (status badge), 掲載先 (outline badges Globe "WEBサイト" / Smartphone "モバイルアプリ"), 公開日時 / 公開予定日時 (label switches for 公開予定), 掲載終了日 — src: blog-detail.tsx:L290-L325
- [x] PAR016 掲載先 shows only モバイルアプリ for WEB-off (sync-excluded) — src: blog-detail.tsx:L303-L311
- [x] PAR017 公開日時 "—" for 下書き; 掲載終了日 "—" when unset — src: blog-detail.tsx:L315-L322

## Status card (right column)

- [x] PAR018 公開中: StatusCard tone success, Globe icon, label 公開中, meta "{日時} 公開", full-width small outline button 非公開にする (edit permission rules) — src: blog-detail.tsx:L332-L368
- [x] PAR019 公開予定: tone info, Clock icon, label 公開予定, meta "{日時} に自動公開されます", button 予約を取り消す — src: blog-detail.tsx:L371-L406
- [x] PAR020 非公開: tone muted, Globe icon, label 非公開, meta "{日時} 非公開に変更", no action — src: blog-detail.tsx:L409-L416
- [x] PAR021 下書き: tone muted, FileText icon, label 下書き, meta "{日時} 最終保存", no action — src: blog-detail.tsx:L419-L426
- [x] PAR022 削除済み: tone destructive, Trash2 icon, label 削除済み, meta "{日時} 削除", no action — src: blog-detail.tsx:L429-L436

## WordPress連携 card

- [x] PAR023 Card title "WordPress連携"; field 同期ステータス — src: blog-detail.tsx:L439-L446
- [x] PAR024 連携対象外 muted badge + note "WEBサイト掲載がOFFのため" (WEB off) — src: blog-detail.tsx:L447-L450, L470-L472
- [x] PAR025 未連携 muted badge + note "公開時にWordPressへ連携されます" (公開予定 / 下書き) — src: blog-detail.tsx:L451-L454, L467-L469
- [x] PAR026 同期済み outline badge with Check icon + 最終同期 time (公開中 / 非公開 / 削除済み) — src: blog-detail.tsx:L455-L466
- [x] PAR027 Notes: 非公開 "非公開状態を同期済み"; 削除済み "削除に伴いWordPress側は非公開化されています" — src: blog-detail.tsx:L473-L478
- [x] PAR028 同期失敗 and 未同期 states (inherited Q1) — spec extension, not in V0; no 再同期 action (Clarification Q2 = A)

## その他情報 card

- [x] PAR029 Card title "その他情報"; fields in order 作成日時, 作成者 (size-6 initial avatar + name), 更新日時, 最終更新者 (initial avatar + name) — src: blog-detail.tsx:L484-L515

## Dialogs

- [x] PAR030 Delete: "このブログ記事を削除しますか？" / "削除した記事は一定期間内であれば復元できます。WEBサイトとアプリから即時に表示されなくなります。" / キャンセル · 削除する (destructive) — src: blog-detail.tsx:L166-L181
- [x] PAR031 Unpublish: "記事を非公開にしますか？" / "この記事は公開中の状態から非公開に変更されます。WEBサイトやアプリから表示されなくなります。" / キャンセル · 非公開にする (destructive) — src: blog-detail.tsx:L351-L364
- [x] PAR032 Cancel schedule: "予約公開を取り消しますか？" / "設定した公開日時での自動公開を取り消し、非公開の状態に戻します。" / キャンセル · 予約を取り消す (destructive) — src: blog-detail.tsx:L389-L402
- [x] PAR033 Restore: "記事を復元しますか？" / "この記事を非公開状態として復元します。復元後は編集・公開が可能になります。" / キャンセル · 復元する — src: blog-detail.tsx:L522-L535
- [x] PAR034 Permanent delete: "完全に削除しますか？" / "この記事を完全に削除します。この操作は取り消せません。すべてのデータが永久に失われます。" / キャンセル · 完全削除する (destructive) — src: blog-detail.tsx:L538-L551 — NOT built (Clarification Q1 = B): verify the dialog and its trigger are absent
- [x] PAR035 Dialogs are controlled; キャンセル / close changes nothing — src: blog-detail.tsx:L166, L351, L389, L522, L538

## Preview dialog

- [x] PAR036 Title "プレビュー", sm:max-w-4xl, max-h-[90vh] scrollable; tabs PC (Monitor) / モバイル (Smartphone), PC default — src: blog-detail.tsx:L554-L569
- [x] PAR037 PC: browser chrome (3 dots, URL bar "https://www.joyfit.jp/blog/{id}"), category badge, title, "{日付} 公開", 16:9 image area, body, note "※ 実際のWEBサイト表示と異なる場合があります" — src: blog-detail.tsx:L572-L616
- [x] PAR038 モバイル: 375px phone frame (rounded-[2.5rem], border-[8px]), status bar "9:41", section label "ブログ", image area, category badge, title, body (scroll max-h-[480px]), "{日付} 公開", note "※ 実際のアプリ表示と異なる場合があります" — src: blog-detail.tsx:L619-L653
