# Plan: Hide Phase 2 screens (scope 2026-10-23)

Scope source: [scope-2026-10-23.md](./scope-2026-10-23.md)

## 1. Phase 2 features → existing routes

| ID         | Flow                                      | Route in code                                               | Current sidebar entry                          |
| ---------- | ----------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| E-03       | トレーニング機材管理 - Training-equipment | `/training-equipment` (+ `/:id`, `/create`, `/:id/edit`)    | 施設設備管理 › トレーニング機材管理            |
| C-01 FR-S… | 見学・体験の管理 - Visit Experience       | `/visit-experiences` (+ `/:id`)                             | 入会処理 › 見学・体験管理                      |
| Y-05       | アプリ配信バージョン管理 - App Version    | `/app-versions` (+ `/:id`, `/create`, `/:id/edit`)          | システム設定 › アプリ配信バージョン管理        |
| Y-06       | アプリメンテナンス管理 - App Maintain     | `/app-maintenance` (+ `/create`, `/:id/edit`)               | システム設定 › アプリメンテナンス管理          |
| Y-10       | CRMメンテナンス管理 - CRM Maintain        | `/crm-maintenance` (+ `/:id`, `/create`, `/:id/edit`)       | システム設定 › CRMメンテナンス管理             |
| I-02       | 告知・ブログ管理 - Content/ Blog          | `/announcements`, `/banners/*`, `/article-categories/*`     | コンテンツ › お知らせ管理 / バナー管理         |
| I-03       | 通知管理 - Noti                           | `/manual-notifications/*`                                   | コンテンツ › 手動配信通知                      |
| Z-01       | ダッシュボード - Dashboard                | `/` (empty page), see section 5                             | ダッシュボード                                 |
| —          | 家族入会 (not on the scope list)          | `/family-registrations/*`                                   | Already commented out ("Remove on this phase") |
| A-03 FR-0… | Emergency Suspension                      | No route yet                                                | —                                              |
| Y-12       | ポイントマスタ管理 - Point                | No route yet                                                | —                                              |
| I-01       | 店舗ページ管理 - Store page               | No route yet                                                | —                                              |
| X-01       | 分析・レポート - Analysis & Report        | No route yet                                                | —                                              |
| Y-11       | 称号管理                                  | No route yet                                                | —                                              |
| Y-15       | 組織階層管理 - Org                        | No route yet (its UI inside Store is already commented out) | —                                              |

Kept (Phase 1, easy to confuse):

- `/option-discount`: part of G-02 オプション管理, opened from a button on `/options`.
- `/surveys/analytics`: the 集計分析 part of G-04 アンケート, not X-01.
- `/exercise-master`: the master data of Y-08. It calls the training-equipment tool-type API, but only to read data; it never navigates there.

## 2. Hide sidebar entries

File: [app-sidebar.tsx](../../src/components/layout/app-sidebar.tsx)

- One source of truth, `src/constants/phase.constants.ts`:
  `PHASE2_ROUTE_PREFIXES = ['/training-equipment', '/visit-experiences', '/app-versions', '/app-maintenance', '/crm-maintenance', '/announcements', '/banners', '/article-categories', '/manual-notifications', '/family-registrations']`
  plus the helper `isPhase2Route(pathname)` in `src/utils/phase.util.ts` (segment-aware matching, same as `matchesHref`).
- The sidebar filters `menuItems` through this helper. It drops Phase 2 sub-items, and drops a parent once neither its own `href` nor any sub-item is left.
- Resulting sidebar:
  - **コンテンツ**: the whole group is hidden (all 3 entries are Phase 2). The `商材・配信` section stays because 商材・施策設定 remains.
  - **入会処理**: 見学・体験管理 is removed.
  - **施設設備管理**: トレーニング機材管理 is removed.
  - **システム設定**: アプリ配信バージョン管理, アプリメンテナンス管理 and CRMメンテナンス管理 are removed. The `規約・アプリ` group keeps only 規約文書管理.
  - **ダッシュボード**: see section 5.
- Filtering by the list is preferred over commenting out lines one by one (as was done for 家族入会): when Phase 2 starts, only the prefix has to be removed from the list.

## 3. Block direct URL access

Hiding the sidebar alone still lets users reach the screens by typing the URL or opening a bookmark.

- [proxy.ts](../../src/proxy.ts): if `isPhase2Route(pathname)`, redirect to `/todo`. The proxy runs for every page, so sub-pages (`/:id`, `/create`, `/:id/edit`) are blocked too. Unauthenticated users still go to the login page first.
- Add a `/todo` page at `src/app/(private)/todo/page.tsx` showing "準備中", following the existing pattern in [announcements/page.tsx](<../../src/app/(private)/announcements/page.tsx>) (`Construction` icon).
  - Then run `npm run generate-routes` to update `routes.config.ts` (generated file).
  - `/todo` needs no permission (not added to `permission.constants.ts`).
- Phase 2 code and permission entries are not deleted, only hidden, so they are easy to turn back on.

## 4. Inventory: actions on Phase 1 screens that navigate to Phase 2

How it was scanned: grep for every `navigate(...)`, `router.push`, `href` or route literal pointing at a Phase 2 prefix. The Phase 2 folders themselves, the sidebar, `routes.config`, `permission.constants`, the mock API and tests were excluded. A second keyword scan (見学/体験/ポイント/称号/お知らせ/バナー/通知/分析…) looked for buttons or tabs leading to Phase 2 features that have no route yet.

### 4.1 Actual navigation actions: **1 case**

| #   | Phase 1 screen        | Location                                                                                                                           | Action                                                         | Target (Phase 2)               | Decision                                                                            |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| 1   | Y-08 エクササイズ詳細 | [exercises/[id]/\_components/basic-info-tab.tsx:119](<../../src/app/(private)/exercises/[id]/_components/basic-info-tab.tsx#L119>) | Click a row in the 関連機材 table → `/training-equipment/[id]` | E-03 Training-equipment detail | **Keep the logic as is**: the proxy redirects `/training-equipment/[id]` to `/todo` |

### 4.2 Navigation to `/` (Z-01 Dashboard): 4 places, handled together in section 5

| #   | Location                                                                                                     | Behavior                                   |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 1   | [login-initial/success/page.tsx:29](<../../src/app/(shared)/login-initial/success/page.tsx#L29>)             | 「ダッシュボードへ進む」 button            |
| 2   | [magic-link-verify.tsx:35](<../../src/app/(public)/(auth)/magic-link/_components/magic-link-verify.tsx#L35>) | Redirect after magic-link login            |
| 3   | [global.util.ts:50-78](../../src/utils/global.util.ts#L50-L78) `safeRedirect`                                | Default target after login                 |
| 4   | [proxy.ts:76](../../src/proxy.ts#L76)                                                                        | Logged-in user opening a public page → `/` |

### 4.3 Header user menu: 4 unbuilt items → `/todo`

[app-header.tsx](../../src/components/layout/app-header.tsx): プロフィール, アカウント設定, 通知設定 and ヘルプ had no action. They now open `/todo` via `guardedPush`, so an unsaved form still gets its leave confirmation.

### 4.4 Mentions of Phase 2 features without navigation: kept as is

- The 「ポイント履歴」 tab and the ポイント手動返還 dialog on member detail: these are the member's own data (A-01), not ポイントマスタ (Y-12).
- Notification topic labels (ポイント / 称号 / お知らせ) on member detail: display text only.
- The 「見学・体験の登録情報から…」 prefill on `membership-applications/create`: this flow goes **from** Phase 2 into Phase 1. Once Visit Experience is hidden the flow simply is not triggered; no change needed.
- Store: テリトリー / 組織階層 (Y-15) is already commented out with a `TODO(round3)` note.

### Conclusion

There is only **1** actual navigation action from Phase 1 to Phase 2. Decision: keep the code as is. The proxy (section 3) redirects it to `/todo`, so no Phase 1 screen needs to change.

## 5. Dashboard `/` (Z-01): decided

All navigation to `/` stays unchanged. The home page `src/app/(private)/page.tsx` redirects to `/members`. The ダッシュボード sidebar entry is hidden.

## 6. Implementation order

1. `phase.constants.ts` + the `isPhase2Route` helper.
2. Sidebar filtering (section 2).
3. `/todo` page + `npm run generate-routes`.
4. Redirect in the proxy (section 3).
5. Exercise detail (section 4.1): no change needed, the proxy redirects.
6. Dashboard handling as decided (section 5).
7. `npm run lint`. Manual check: the sidebar for each role, and typing Phase 2 URLs directly (list/detail/create/edit) must land on `/todo`.

## 7. Decisions (2026-10-27)

- Dashboard: keep navigation to `/`, the home page redirects to `/members`, the sidebar entry is hidden.
- `/banners` and `/article-categories` belong to I-02: confirmed, hidden.
- `/family-registrations`: confirmed, added to the blocked list.
