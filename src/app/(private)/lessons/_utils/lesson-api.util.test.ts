/**
 * Unit test for `fetchAllPages` — the schedule sheet's 繰り返し設定 is read whole, every page up to
 * the last (k.iwaki on FE !200: one `limit` page, or a fixed number of pages, drops the rest).
 *
 * The repo has no test runner wired into `package.json` yet — run this file with Node's built-in
 * runner through tsx (which resolves the `@/…` tsconfig paths):
 *
 * ```sh
 * npx tsx --test "src/app/(private)/lessons/_utils/lesson-api.util.test.ts"
 * ```
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RECURRENCE_PAGE_SIZE } from '../_constants/constants';
import { type ListPaging, fetchAllPages } from './lesson-api.util';

/** A fake list endpoint serving `total` rows in pages of `paging.limit`. */
function fakeList(total: number) {
  const calls: ListPaging[] = [];
  const fetchPage = async (paging: ListPaging) => {
    calls.push(paging);
    const start = (paging.page - 1) * paging.limit;
    const items = Array.from(
      { length: Math.max(0, Math.min(paging.limit, total - start)) },
      (_, i) => start + i,
    );
    return { items, pagination: { totalPages: Math.ceil(total / paging.limit) } };
  };
  return { calls, fetchPage };
}

describe('fetchAllPages', () => {
  it('reads every page at the given limit and concatenates them in order', async () => {
    const { calls, fetchPage } = fakeList(450);
    const rows = await fetchAllPages(RECURRENCE_PAGE_SIZE, fetchPage);
    assert.equal(rows.length, 450);
    assert.deepEqual(rows.slice(0, 3), [0, 1, 2]);
    assert.equal(rows[449], 449);
    assert.deepEqual(calls, [
      { page: 1, limit: RECURRENCE_PAGE_SIZE },
      { page: 2, limit: RECURRENCE_PAGE_SIZE },
      { page: 3, limit: RECURRENCE_PAGE_SIZE },
    ]);
  });

  it('stops after one call when everything fits on the first page', async () => {
    const { calls, fetchPage } = fakeList(42);
    assert.equal((await fetchAllPages(RECURRENCE_PAGE_SIZE, fetchPage)).length, 42);
    assert.equal(calls.length, 1);
  });

  it('makes one call for an empty list', async () => {
    const { calls, fetchPage } = fakeList(0);
    assert.deepEqual(await fetchAllPages(RECURRENCE_PAGE_SIZE, fetchPage), []);
    assert.equal(calls.length, 1);
  });

  it('does not stop at a fixed number of pages', async () => {
    const { calls, fetchPage } = fakeList(25 * RECURRENCE_PAGE_SIZE + 1);
    const rows = await fetchAllPages(RECURRENCE_PAGE_SIZE, fetchPage);
    assert.equal(rows.length, 25 * RECURRENCE_PAGE_SIZE + 1);
    assert.equal(calls.length, 26);
  });

  it('propagates a failed page instead of returning a partial list', async () => {
    await assert.rejects(
      fetchAllPages(RECURRENCE_PAGE_SIZE, async (paging) => {
        if (paging.page === 2) throw new Error('E-SYS-001');
        return { items: [1], pagination: { totalPages: 3 } };
      }),
      /E-SYS-001/,
    );
  });
});
