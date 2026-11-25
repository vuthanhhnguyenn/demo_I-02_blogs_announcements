# SDD 開発ワークフロー — Fitness CRM

> Fitness CRM プロジェクトにおける、**SpecKit**（GitHub Copilot）を使ったAI支援開発フロー。
> 参照: [sdd-sequence-flow.md](./sdd-sequence-flow.md) | [constitution.md](../.specify/memory/constitution.md)

---

## 概要

```
PO / PM → 機能アイデア
    |
    v
[Phase 1] キックオフ & ハンドオフ ──── プロトタイプ + 画面フロー + 仕様素材を feature ブランチへコミット
    |
    v
Feature Branch (###-feature-name)
    |
    v
[Phase 2] FE: 仕様分析 & 実装
    |
    ├─ speckit.specify ──── spec.md（ドラフト）
    ├─ speckit.clarify ──── spec.md（最終化、[NEEDS CLARIFICATION] 解消）
    ├─ speckit.plan    ──── plan.md · research.md · data-model.md · api-contracts/
    ├─ speckit.tasks   ──── tasks.md
    ├─ speckit.analyze ──── 整合性レポート（spec / plan / tasks）
    └─ speckit.implement── コード + テスト
```

---

## Phase 1: キックオフ & ハンドオフ

PO/PM がプロトタイプ、画面フロー、仕様素材を feature ブランチへコミットし、チームへ通知する。

### ブランチ命名

```
###-feature-name
# 例: 001-staff-list
```

### コミット対象

| 資産                               | 配置先             |
| ---------------------------------- | ------------------ |
| Prototype（HTML または Figma URL） | `specs/<feature>/` |
| Flow screens（PNG / Figma）        | `specs/<feature>/` |
| Spec assets（Markdown メモ）       | `specs/<feature>/` |

---

## Phase 2: FE 仕様分析 & 実装

### Step 1 — 仕様ドラフト（`speckit.specify`）

機能説明とコミット参照を渡して `spec.md` を生成。

**出力:** `specs/<feature>/spec.md`（ドラフト）

### Step 2 — 明確化（`speckit.clarify`）

未確定事項を最大5件まで質問し、すべて解消してから次へ進む。

**出力:** `specs/<feature>/spec.md`（最終化）

### Step 3 — 実装計画（`speckit.plan`）

**出力:**

- `specs/<feature>/plan.md`
- `specs/<feature>/research.md`
- `specs/<feature>/data-model.md`
- `specs/<feature>/contracts/api-contracts.md`

### Step 4 — タスク分解（`speckit.tasks`）

**出力:** `specs/<feature>/tasks.md`

### Step 5 — 整合性分析（`speckit.analyze`）

`spec.md` / `plan.md` / `tasks.md` の整合性を読み取り専用で検査。

- Constitution違反は **CRITICAL**（修正必須）
- 不整合・欠落は **HIGH / MEDIUM**（修正または根拠記録）

### Step 6 — 実装（`speckit.implement`）

`tasks.md` の順序に従って実装。必須順序:

1. Data Layer
2. API Routes（`generate-openapi` → `generate-api`）
3. UI Components
4. Validation（`type-check` / `lint` / `build` / 手動テスト）

---

## Phase 3: BE 連携 & FE-BE 契約QA

FE が `api-contracts/` を BE に引き渡し、実API実装後に `openapi.json` を確定。

**Review Gate 2:** FE + BE で契約一致を確認。

---

## Phase 4: FE 実API統合

1. `speckit.plan` で統合計画を作成
2. `speckit.implement` で統合実装
3. `loading / error / empty / success` の4状態を確認

---

## Phase 5: QC システムテスト

| 入力                     | 提供元  |
| ------------------------ | ------- |
| 統合済みテストビルド     | FE Dev  |
| `spec.md` + 受け入れ基準 | PO / PM |

---

## Phase 6: バグトリアージ & 修正

FEバグの場合の流れ:

1. `speckit.specify` で bug scope を `spec.md` に反映
2. 必要時は PO に仕様変更判断をエスカレーション
3. `speckit.tasks` で `tasks-bug.md` 生成
4. `speckit.implement` で修正実施

---

## Phase 7: 検証 & リリース

QC再検証後、PO/PM が MR 承認し、main / release ブランチへマージして本番反映。

---

## Definition of Done（抜粋）

- `npm run type-check` が 0 エラー
- `npm run lint` が 0 エラー
- 契約テストが全通過
- Constitution Check が明示的に pass / N/A / 例外理由つき
- QC サインオフ完了

---

## テスト自動化ワークフロー（ブラックボックステストスキル）

> `.claude/skills/` 配下の3つの Claude Code スキル `plan-testcases` → `gen-testcases` → `execute-testcases` が、画面/機能単位のブラックボックステストケース作成〜実行を自動化する。**Phase 5: QC システムテスト** に再現可能で根拠付きのパイプラインを提供するが、Review Gate 1（仕様承認）後であれば Dev / QA がいつでも実行でき、Phase 5 を待つ必要はない。

```
specs/<feature>/spec.md（承認済み）
    |
    v
[Skill 1] plan-testcases ──────────── specs/<feature>/tests/test-plan.md
    |
    v
[Skill 2] gen-testcases（単位ごと）── specs/<feature>/tests/cases/TC -….md
    |
    v
[Skill 3] execute-testcases（文書ごと） 同一ファイルに OK / NG / Block を記入
    |
    v
NG あり? ──→ Phase 6: バグトリアージ & 修正（TC文書中の Bug ID を参照）
```

### 3スキル共通の原則

| 原則                                      | 理由                                                                                                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **オラクルは仕様書 + UIモックアップのみ** | ケースと期待結果は `spec.md`・参照要件文書・UIモックアップから作る。`src/**` は読まない。実装を読んでテストを書く/判定すると自己言及的になり、コードの誤りを検出できなくなる。                 |
| **チェックリスト優先**                    | `common-function-checklist.md` / `common-gui-validate-checklist.md` は共有の生きた文書。欠けているチェック観点はまずここに追加し、画面のケースへ展開する。今後のすべての画面がそれを引き継ぐ。 |
| **実行は1回のみ**                         | TC文書は**1回だけ**実行する。Round 2 は無い。失敗は `NG` + バグID として記録し、Phase 6 の修正後は Dev が手動で再確認する。                                                                    |
| **タブレット以上のみ対象**                | 対応ビューポートの基準はタブレット横向き/デスクトップ。モバイル幅のケースは対象外（Mobile 結果列は無し）。                                                                                     |

### スキル1 — `plan-testcases`

機能をテスト単位（画面/クラスタ単位）に分割し、1つの文書で機能全体をカバーしようとしないようにする。

- **入力:** `spec.md`、参照される要件文書、UIモックアップ。`src/**` は読まない。
- **出力:** `specs/<feature>/tests/test-plan.md` — 単位テーブル、単位ごとのソース、カバレッジの焦点、`FR-xxx → unit` トレーサビリティ、実行時の注意事項（ロール/認証情報、BEモック時の留意点）、推奨実行順。
- **実行タイミング:** 機能ごとに1回、Review Gate 1（仕様承認）直後、テストケース生成前。

### スキル2 — `gen-testcases`

テスト単位（画面またはクラスタ）1つ分のテストケース文書を作成する。

- **入力:** テストプランが存在する場合はその単位のエントリ（対応する仕様セクション + UIモックアップ）。プランが無ければ依頼内容からスコープを決定。常に共有の2つのチェックリストと照合する。
- **出力:** `specs/<feature>/tests/cases/TC -【Fitness CRM】- [<ScreenID>][<ScreenName>].md` — チェックごとに1行（カテゴリI/II/III、正常/異常、手順、期待結果、優先度）。実行列は次のスキル用に空欄。
- **実行タイミング:** テスト単位ごとに1回、`plan-testcases` の後（プラン未作成なら仕様書から直接）。

### スキル3 — `execute-testcases`

`.claude/skills/execute-testcases/harness/` 配下のヘッドレス Playwright ハーネスを使い、実際に起動中のアプリをブラックボックステスターとして操作し、TC文書の実行列を記入する。

- **入力:** `gen-testcases` が生成したTC文書、および存在する場合はテストプランの「実行時の注意事項」セクション。
- **出力:** 同じTCファイルに `Status`（OK / NG / Block / Untested）、`Bug ID`、`Bug Priority`、`Notes` をケースごとに記入し、実行結果サマリの件数も記入。
- **実行タイミング:** 機能がテスト可能な環境（`npm run dev`）で動いているとき。修正は Phase 6 経由で行い、その後の再確認は手動フォローアップであり2回目の自動実行ではない。

### 生成されるファイル一覧

| パス                                                | 生成元                       | 内容                                                         |
| --------------------------------------------------- | ---------------------------- | ------------------------------------------------------------ |
| `specs/<feature>/tests/test-plan.md`                | `plan-testcases`             | テスト単位の分割、ソース、カバレッジの焦点、トレーサビリティ |
| `specs/<feature>/tests/cases/TC -….md`              | `gen-testcases`              | 画面/単位ごとのテストケース文書                              |
| `tests/checklists/common-function-checklist.md`     | 共有；`gen-testcases` が更新 | 機能横断の共通チェック                                       |
| `tests/checklists/common-gui-validate-checklist.md` | 共有；`gen-testcases` が更新 | 機能横断のGUI/バリデーション共通チェック                     |
| `tests/test-case-template.md`                       | 共有                         | 列構成・命名規則のリファレンス                               |

> 詳細な手順例（`014-instructor-management` の Staff List 画面を使った plan → gen → execute の一連の流れ）は [sdd-dev-workflow.md#test-automation-workflow-black-box-testing-skills](../sdd-dev-workflow.md#test-automation-workflow-black-box-testing-skills) を参照。
