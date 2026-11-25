# UI Parity Checklist: Blog Form (ブログ新規登録・編集)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `fitness-crm-ui/src/pages/blog-form.tsx`@47d60ac (modes `create` / `edit`)
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

## Page header & layout

- [x] PAR001 Back link "ブログ管理に戻る" (asks to discard when dirty) — src: blog-form.tsx:L212-L219
- [x] PAR002 Title "ブログ新規登録" (create) / "ブログ編集" (edit) — src: blog-form.tsx:L127-L128, L220
- [x] PAR003 Main scroll area px-6 py-4; single column `max-w-[960px] mx-auto` with gap-6 between cards — src: blog-form.tsx:L223-L225
- [x] PAR004 Field layout: label text-sm with RequiredMark / OptionalMark, optional description text-xs muted, inline error text-xs destructive — src: blog-form.tsx:L72-L87

## 記事コンテンツ card

- [x] PAR005 Card title "記事コンテンツ"; fields in order タイトル, 本文, サムネイル画像 — src: blog-form.tsx:L227-L290
- [x] PAR006 タイトル required input, placeholder "例: 初心者向け！自宅でもできる筋トレメニュー5選", error "タイトルを入力してください" — src: blog-form.tsx:L233-L240, L157
- [ ] PAR007 本文 required editor in a bordered box; toolbar row (bg-muted/30, border-b): style select 標準 / 見出し1 / 見出し2, separator, Bold, Italic, separator, List, Link, Image; editor area ~16 rows, placeholder "記事の本文を入力してください..."; error border + "本文を入力してください" — src: blog-form.tsx:L241-L273, L158 — ⚠ Gap: (2026-11-13 Chrome run) The toolbar renders 標準/見出し1/見出し2, Bold, Italic, List, Link and Image as Quill .ql-formats groups [style][B I][List][Link Image], 15px apart with border-right 0. No visible separator line between style and Bold or between Italic and List, and List sits in its own group apart from Link/Image. Everything else matches: bordered box, bg-muted/30 toolbar with border-b, 320px editor, placeholder, red border + 本文を入力してください
- [x] PAR008 サムネイル画像: 160px 16:9 bordered preview, outline sm button Upload "画像を選択", hint "推奨: 1200×630px / PNG, JPG (最大5MB)" — src: blog-form.tsx:L274-L287

## カテゴリ card

- [x] PAR009 Card title "カテゴリ" with right-aligned ghost sm "カテゴリを管理" (Settings icon), HQ / System only — src: blog-form.tsx:L293-L306
- [x] PAR010 カテゴリ optional select (max-w-[320px], placeholder "カテゴリを選択") listing blog categories — src: blog-form.tsx:L309-L322
- [x] PAR011 HQ / System extra item after a separator: Plus "新規カテゴリを追加" (primary, font-medium) navigating to category create — src: blog-form.tsx:L323-L337
- [x] PAR012 Clear button (ghost icon size-8, X, aria-label "カテゴリを外す") shown only when a category is selected — src: blog-form.tsx:L341-L352

## 配信対象 card

- [x] PAR013 Card title "配信対象"; 配信範囲 required radio group of three bordered cards (selected: border-primary ring-1 ring-primary) — src: blog-form.tsx:L360-L368
- [ ] PAR014 全社配信 card: label + "全ブランド・全店舗のサイト/アプリに掲載"; disabled (opacity-60) with "※ Manager以上のみ選択できます" below Manager — src: blog-form.tsx:L369-L382 — spec extension (Q1): ブランド指定 is disabled for Staff the same way — ⏸ Deferred: Blocked: HQ session only. As HQ the 全社配信 card shows the label + description and is enabled. The Manager-below disabled state, the ※ Manager以上のみ選択できます hint and the Staff ブランド指定 extension were not observed
- [x] PAR015 ブランド指定 card: label + "選択したブランドの全店舗に掲載"; expanded panel (bg-muted/30) "対象ブランドを選択（複数可）" + 3-column checkboxes JOYFIT全体, Joyfit（スタンダード）, Joyfit24, JoyfitYoga, JoyfitPlus, FIT365 — src: blog-form.tsx:L384-L405, L90-L97
- [x] PAR016 JOYFIT全体 ↔ sub-brands mutually exclusive — src: blog-form.tsx:L195-L204
- [x] PAR017 Selection summary (bg-muted rounded p-3): "{n} ブランド選択中" + secondary badges — src: blog-form.tsx:L406-L416
- [x] PAR018 店舗指定 card: label + "特定の店舗のサイト/アプリに掲載"; expanded panel with multi store combobox "対象店舗を選択..." (max-w-[360px]) — src: blog-form.tsx:L421-L440 — spec extension (Q2): one brand family only, error 「同一ブランドの店舗を選択してください」
- [x] PAR019 Changing scope clears brands / stores; scope target error "対象ブランドを1つ以上選択してください" / "対象店舗を1つ以上選択してください" — src: blog-form.tsx:L164-L165, L367
- [x] PAR020 全社配信 warning Alert (border-warning/50 bg-warning/15, AlertTriangle): title "全社配信", description "全ブランド・全店舗のサイト/アプリに記事が掲載されます。内容を十分に確認してから公開してください。" — src: blog-form.tsx:L445-L454
- [x] PAR021 掲載先 required: checkboxes Globe "WEBサイト" and Smartphone "モバイルアプリ" (both default on); error "WEBサイト・モバイルアプリのいずれか1つ以上を選択してください" — src: blog-form.tsx:L456-L483, L162

## 公開設定 card

- [x] PAR022 Card title "公開設定"; 公開方法 required radio: 即時公開 "保存と同時に公開されます", 予約公開 "指定した日時に自動公開されます", 下書き保存 "公開せずに保存します" (default 即時公開) — src: blog-form.tsx:L489-L523 — spec extension (Q3): edit mode preselects from status; 非公開 adds 「非公開のまま保存」
- [x] PAR023 予約公開 shows 公開日時 required (date + time, max-w-[400px]) with description "保存後、設定した日時に自動公開されます"; error "公開日時を指定してください" — src: blog-form.tsx:L524-L534, L160
- [x] PAR024 掲載終了日 optional date picker with description "設定した日に自動的に非公開になります（任意）" — src: blog-form.tsx:L535-L540

## Footer

- [x] PAR025 Footer (border-t p-4, right-aligned): キャンセル (outline lg) · プレビュー (outline lg, Eye) · save button (lg) labelled 公開する / 予約公開する / 下書き保存する — src: blog-form.tsx:L546-L558
- [x] PAR026 On invalid submit: "未入力の項目があります" (text-xs destructive, left) and scroll to first invalid field — src: blog-form.tsx:L169-L179, L547-L549
- [x] PAR027 Success toasts: "ブログを下書きとして保存しました" / "ブログを予約公開として保存しました" / "ブログを公開しました" — src: blog-form.tsx:L183-L189

## Preview dialog

- [x] PAR028 Same PC / モバイル preview (title fallback "記事タイトル", body fallback "記事の本文がここに表示されます...", category badge, image area, date "{日付} 公開", disclaimers) using current form values — src: blog-form.tsx:L562-L648

## Discard dialog

- [x] PAR029 "変更を破棄しますか？" / "未保存の変更はすべて失われます。この操作は取り消せません。" / 編集を続ける · 破棄する; only when dirty — src: blog-form.tsx:L651-L665, L153
