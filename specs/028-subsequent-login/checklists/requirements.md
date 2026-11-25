# Specification Quality Checklist: Subsequent Login (AUTH-01 認証・ログイン)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-05
**Last revalidated**: 2026-08-25 (after the magic-link amendment)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- All items pass. No `[NEEDS CLARIFICATION]` markers were needed — MFA, password reset, and magic-link scope boundaries were resolved via reasonable defaults grounded in the requirement doc's own "undecided" markers (`Y-13-Q01`) and the user's explicit scope statement ("using either Google or Cognito"), documented in the Assumptions section.

### 2026-08-25 revalidation — magic-link amendment

Re-ran every item above against the amended spec (User Story 4, FR-012–FR-022, SC-007–SC-010, 7 new edge cases, 6 new/revised assumptions). All items still pass; no `[NEEDS CLARIFICATION]` markers were introduced. Points resolved by informed default rather than a question:

- **Whether magic link should be refused for Google-path staff** — Y-13 FR-S001 describes it as "経路②のスタッフ向け", but refusing would itself disclose which path an address belongs to, contradicting the non-disclosure rule (FR-014). Resolved as: accept for any active staff, state the intent in on-screen copy only. Recorded in Assumptions and in the Edge Cases.
- **Whether a magic-link sign-in should honour a remembered pre-login destination** (as FR-006 does) — resolved to "no, always the dashboard", because the link is typically opened in a different browser where no such destination exists. Recorded in Assumptions.
- **Whether a password-attempt lockout blocks magic-link issuance** — resolved to "no", by analogy with Y-13 FR-M008's explicit rule that password reset stays available during a lockout. Recorded in the Edge Cases.
- **HQ-issued magic links (Y-13 FR-S001 発行経路2)** — held out of scope as a Y-01 staff-detail capability, with a note that such a link is consumed by the same link-opening flow specified here. Recorded in Assumptions.
- **Resend cooldown duration** — the requirement spec is silent; the UI prototype's 60 seconds was adopted and FR-016 states it explicitly so the requirement stays testable, with the Assumptions flagging it as the one tunable value.

The only measurable-outcome caveat: SC-007's "under 15 seconds" for opening the link excludes email delivery latency, which Assumptions place outside this feature's ownership.

- Provider names (Google, Cognito) are retained only where they name a business-facing choice the staff member makes or where quoting the original input verbatim; the body otherwise avoids technical/API-level detail (verified by a targeted re-read for endpoint paths, framework names, and provider-internal mechanics after first-draft review, which found and corrected two leaks).
