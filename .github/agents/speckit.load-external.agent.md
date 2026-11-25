---
description: Load spec requirements from repo dx-fitness/fitness-spec and UI mockups from repo dx-fitness/fitness-crm-ui, then return a structured context block for the speckit pipeline.
---

## User Input

```text
$ARGUMENTS
```

Input may be a spec ID (`A-02`, `Y-01`), a keyword/page name (`member-list`, `移籍管理`), or flags `--spec-only` / `--ui-only`.

---

## Repos

| Role | Repo                                                                         | Cache dir               |
| ---- | ---------------------------------------------------------------------------- | ----------------------- |
| Spec | `dx-fitness/fitness-spec` (`git@github.com:dx-fitness/fitness-spec.git`)     | `.cache/fitness-spec`   |
| UI   | `dx-fitness/fitness-crm-ui` (`git@github.com:dx-fitness/fitness-crm-ui.git`) | `.cache/fitness-crm-ui` |

All file access via git only — never local filesystem.

---

## Spec ID → File Map

| ID   | Label (EN)                       | File                       |
| ---- | -------------------------------- | -------------------------- |
| A-01 | Member Management (List)         | `crm/requirements/A-01.md` |
| A-02 | Transfer Management (List)       | `crm/requirements/A-02.md` |
| A-03 | Leave & Withdrawal (List)        | `crm/requirements/A-03.md` |
| B-01 | Entry/Exit Management            | `crm/requirements/B-01.md` |
| C-01 | Enrollment Application           | `crm/requirements/C-01.md` |
| D-01 | Lesson Management                | `crm/requirements/D-01.md` |
| D-02 | Lesson Content Management        | `crm/requirements/D-02.md` |
| D-03 | Studio Management                | `crm/requirements/D-03.md` |
| D-04 | Instructor Management            | `crm/requirements/D-04.md` |
| E-01 | Locker Management                | `crm/requirements/E-01.md` |
| E-02 | Store Equipment Management       | `crm/requirements/E-02.md` |
| E-03 | Training Equipment Management    | `crm/requirements/E-03.md` |
| F-01 | Sales Management                 | `crm/requirements/F-01.md` |
| G-01 | Primary Contract Management      | `crm/requirements/G-01.md` |
| G-02 | Option Management                | `crm/requirements/G-02.md` |
| G-03 | Campaign Management              | `crm/requirements/G-03.md` |
| G-04 | Survey Management                | `crm/requirements/G-04.md` |
| G-05 | Enrollment Fee Management        | `crm/requirements/G-05.md` |
| G-06 | Promotion Code Management        | `crm/requirements/G-06.md` |
| I-01 | Store Page Management            | `crm/requirements/I-01.md` |
| I-02 | Notice & Blog Management         | `crm/requirements/I-02.md` |
| I-03 | Notification Management          | `crm/requirements/I-03.md` |
| Y-01 | Staff & Permission Management    | `crm/requirements/Y-01.md` |
| Y-02 | Store Master Management          | `crm/requirements/Y-02.md` |
| Y-03 | FC Company Master Management     | `crm/requirements/Y-03.md` |
| Y-04 | Terms Document Master Management | `crm/requirements/Y-04.md` |
| Y-05 | App Release Version Management   | `crm/requirements/Y-05.md` |
| Y-06 | App Maintenance Management       | `crm/requirements/Y-06.md` |
| Y-07 | Brand Master Management          | `crm/requirements/Y-07.md` |
| Y-08 | Exercise Master Management       | `crm/requirements/Y-08.md` |
| Y-09 | Routine Master Management        | `crm/requirements/Y-09.md` |
| Y-10 | CRM Maintenance Management       | `crm/requirements/Y-10.md` |
| Y-11 | Title Management                 | `crm/requirements/Y-11.md` |
| Y-12 | Auth / Login                     | `crm/requirements/Y-12.md` |

## Spec category → UI page slug

| Category | Slug pattern                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| A        | `member-*`, `transfer-*`, `leave-*`, `blacklist-*`                                                         |
| B        | `entry-exit*`                                                                                              |
| C        | `enrollment-application-*`                                                                                 |
| D        | `lesson-*`                                                                                                 |
| E        | `locker-*`, `equipment-*`, `controller-*`, `training-equipment-*`                                          |
| F        | `sales-*`                                                                                                  |
| G        | `contract-*`, `option-*`, `set-discount*`, `campaign-*`, `survey-*`                                        |
| I        | `store-page-*`, `announcement-*`, `blog-*`, `notification-*`, `banner-*`                                   |
| Y        | `staff-*`, `store-*`, `fc-company-*`, `terms-*`, `app-*`, `brand-*`, `exercise-*`, `routine-*`, `domain-*` |
| Y-12     | `login*`, `password-*`, `first-time-password-set*`                                                         |

---

## Steps

### 1. Update caches

```bash
# Spec repo
git -C .cache/fitness-spec log --oneline -1 2>/dev/null \
  && git -C .cache/fitness-spec fetch --all --prune && git -C .cache/fitness-spec checkout --detach origin/main \
  || git clone git@github.com:dx-fitness/fitness-spec.git .cache/fitness-spec

# UI repo (skip if --spec-only)
git -C .cache/fitness-crm-ui log --oneline -1 2>/dev/null \
  && git -C .cache/fitness-crm-ui fetch --all --prune && git -C .cache/fitness-crm-ui checkout --detach origin/main \
  || git clone git@github.com:dx-fitness/fitness-crm-ui.git .cache/fitness-crm-ui
```

If a repo is unreachable, warn and stop: `⚠️ Cannot access <repo>. Check git auth/network.`

### 2. Resolve files

- **Spec ID** (e.g. `A-02`): normalize to uppercase zero-padded → look up table above → fall back to `git -C .cache/fitness-spec ls-files crm/requirements/`
- **Keyword**: `git -C .cache/fitness-spec grep -il "<keyword>" -- "crm/requirements/*.md"` → take top 3 title matches
- **UI slug**: derive from category table above; if ambiguous check `src/pages/map/screens.ts`

### 3. Read and output raw content

```bash
# Spec
git -C .cache/fitness-spec show HEAD:crm/requirements/<ID>.md

# UI (skip if --spec-only)
git -C .cache/fitness-crm-ui show HEAD:src/pages/<slug>.tsx
```

Output as-is with source headers:

```
---
## External Context: {SPEC_ID or KEYWORD}
Spec source: dx-fitness/fitness-spec @ {HASH} {DATE}
UI source:   dx-fitness/fitness-crm-ui @ {HASH} {DATE}
---

### Spec: crm/requirements/{ID}.md
{raw file content}

### UI: src/pages/{slug}.tsx
{raw file content}
```

If no matching UI page found, output spec only with note: `No matching UI page found.`
