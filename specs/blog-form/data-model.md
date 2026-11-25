# Data Model: Blog Form (ブログ新規登録・編集)

**Feature**: `specs/blog-form/spec.md` | **Date**: 2026-11-13

## Form values (`blogFormSchema`, z.infer → `BlogFormValues`)

| Field                       | Type                                                                                  | Rule / message                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                     | string                                                                                | required 「タイトルを入力してください」; ≤ 255 「タイトルは255文字以内で入力してください」                                                                                    |
| `body`                      | string (HTML)                                                                         | required (text content non-empty) 「本文を入力してください」; ≤ `TEXT_EDITOR_MAX_LENGTH`                                                                                      |
| `thumbnailS3Key`            | string \| null                                                                        | optional; upload validates PNG/JPG ≤ 5MB                                                                                                                                      |
| `thumbnailUrl`              | string \| null                                                                        | display only                                                                                                                                                                  |
| `categoryId`                | string \| null                                                                        | optional                                                                                                                                                                      |
| `scope`                     | `company \| brand \| store`                                                           | required; Staff: only `store` (Q1)                                                                                                                                            |
| `brands`                    | (`joyfitAll` \| `Joyfit` \| `Joyfit24` \| `JoyfitYoga` \| `JoyfitPlus` \| `Fit365`)[] | scope=brand → ≥1 「対象ブランドを1つ以上選択してください」; `joyfitAll` exclusive with JOYFIT subs; JOYFIT(any) + `Fit365` → 「JOYFITとFIT365は同時に選択できません」 (BF-04) |
| `stores`                    | `{ id, name, brandEnum }[]`                                                           | scope=store → ≥1 「対象店舗を1つ以上選択してください」; one family 「同一ブランドの店舗を選択してください」 (Q2)                                                              |
| `channelWeb` / `channelApp` | boolean                                                                               | default true / true; ≥1 「WEBサイト・モバイルアプリのいずれか1つ以上を選択してください」                                                                                      |
| `publishMethod`             | `now \| scheduled \| draft \| keepUnpublished`                                        | default `now` (create) / from status (edit, Q3); `keepUnpublished` only for 非公開 in edit                                                                                    |
| `publishAt`                 | Date \| null                                                                          | scheduled → required 「公開日時を指定してください」; future 「公開日時は現在より後の日時を指定してください」                                                                  |
| `publishEndDate`            | Date \| null                                                                          | optional; after publish date 「掲載終了日は公開日時より後の日付を指定してください」                                                                                           |

## Mapping to the request (F1, F3)

| Form                                        | Request                                                                                                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| scope company                               | `brandScope company, brandCode null, subBrandCodes null, storeScope all, targetStoreIds []`                                                                                        |
| scope brand + `joyfitAll`                   | `brandScope brand, brandCode Joyfit, subBrandCodes null, storeScope all`                                                                                                           |
| scope brand + JOYFIT subs                   | `brandScope brand, brandCode Joyfit, subBrandCodes [subs], storeScope all`                                                                                                         |
| scope brand + `Fit365`                      | `brandScope brand, brandCode Fit365, subBrandCodes null, storeScope all`                                                                                                           |
| scope store                                 | `brandScope store, storeScope specific, targetStoreIds [ids], brandCode family(stores), subBrandCodes JOYFIT subs of stores or null`, mock-only `targetStores [{id,name}]` (BF-01) |
| publishMethod now (create) / changed to now | `publishStatus published` (server sets start = now)                                                                                                                                |
| publishMethod scheduled                     | `publishStatus scheduled, publishStartAt`                                                                                                                                          |
| publishMethod draft                         | `publishStatus draft, publishStartAt null`                                                                                                                                         |
| unchanged method in edit / keepUnpublished  | `publishStatus` omitted (and `publishStartAt` omitted for 公開中)                                                                                                                  |
| publishEndDate                              | `publishEndAt` (end of day JST) or null                                                                                                                                            |
| —                                           | mock-only `operator { staffId, name }` from `/crm/me` (BF-02); PATCH `expectedUpdatedAt` = loaded `updatedAt`                                                                      |

## Reverse mapping (edit defaults)

`detailToFormValues(detail)`: scope from `brandScope`; brands from `brandCode` + `subBrandCodes` (null + Joyfit → `joyfitAll`); stores from `targetStores` (+ brand from directory / store master when available); publishMethod from status (F6); dates parsed from ISO.
