export const LOGIN_ERROR_CODES = {
  /** id_token verification failed (401) — FR-009 retry message. */
  ID_TOKEN_INVALID: 'E-AUTH-032',
  /** Email not a staff record (403) — FR-010 account-status message. */
  STAFF_NOT_FOUND: 'E-AUTH-033',
  /** Deactivated staff (403) — FR-010 account-status message. */
  STAFF_DEACTIVATED: 'E-AUTH-034',
  /** Invite token not found (404) — FR-008, switches to the expired state. */
  INVITE_NOT_FOUND: 'E-AUTH-035',
  /** Invite token already used (410) — FR-008. */
  INVITE_USED: 'E-AUTH-036',
  /** Invite token revoked (410) — FR-008. */
  INVITE_REVOKED: 'E-AUTH-037',
  /** Invite token expired (410) — FR-008. */
  INVITE_EXPIRED: 'E-AUTH-038',
  /** Magic-link token invalid, expired, already used, or superseded (401) — one code by design. */
  MAGIC_LINK_INVALID: 'E-AUTH-030',
} as const;
