/**
 * Unit test for the 最終ログイン relative-time buckets (BUG-P2-01-10).
 *
 * The repo has no test runner wired into `package.json` yet — run this file with
 * Node's built-in runner through tsx (which resolves the `@/…` tsconfig paths):
 *
 * ```sh
 * npx tsx --test "src/app/(private)/staffs/_utils/format-relative-time.util.test.ts"
 * ```
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatRelativeTime } from './format-relative-time.util';

/** Pinned "now" — 2026-09-18 12:00 JST. Every case below is relative to this instant. */
const NOW = new Date('2026-09-18T03:00:00Z');

describe('formatRelativeTime', () => {
  it('renders the JST clock time for a login on the same calendar day', () => {
    assert.equal(formatRelativeTime('2026-09-18T01:30:00Z', NOW), '今日 10:30');
    // 23:00 UTC the previous day is still 08:00 *today* in JST.
    assert.equal(formatRelativeTime('2026-09-17T23:00:00Z', NOW), '今日 08:00');
  });

  it('counts whole days for 1–6 days ago', () => {
    assert.equal(formatRelativeTime('2026-09-17T14:00:00Z', NOW), '1日前');
    assert.equal(formatRelativeTime('2026-09-15T01:00:00Z', NOW), '3日前');
    assert.equal(formatRelativeTime('2026-09-12T01:00:00Z', NOW), '6日前');
  });

  it('switches to months from 7 days ago, never rendering 0ヶ月前', () => {
    assert.equal(formatRelativeTime('2026-09-11T01:00:00Z', NOW), '1ヶ月前');
    // The bug report's 23日前 case — the old code kept counting days here.
    assert.equal(formatRelativeTime('2026-08-26T01:00:00Z', NOW), '1ヶ月前');
    assert.equal(formatRelativeTime('2026-07-10T01:00:00Z', NOW), '2ヶ月前');
    assert.equal(formatRelativeTime('2025-10-18T01:00:00Z', NOW), '11ヶ月前');
  });

  it('switches to years at 12 whole months', () => {
    assert.equal(formatRelativeTime('2025-09-18T01:00:00Z', NOW), '1年前');
    assert.equal(formatRelativeTime('2024-03-18T01:00:00Z', NOW), '2年前');
  });

  it('treats a future timestamp (clock skew) as today', () => {
    assert.equal(formatRelativeTime('2026-09-18T05:00:00Z', NOW), '今日 14:00');
  });

  it('returns an empty string for an unparseable value', () => {
    assert.equal(formatRelativeTime('not-a-date', NOW), '');
  });
});
