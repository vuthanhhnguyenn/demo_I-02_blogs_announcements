/**
 * Unit test for `fetchAllPages` — the bounded lists of the D-01 screens (one store's studios /
 * templates, a date window's holidays and schedules) read every page up to the last, not just the
 * first or a fixed number (k.iwaki on FE !200: either silently drops the rest).
 *
 * The repo has no test runner wired into `package.json` yet — run this file with Node's built-in
 * runner through tsx (which resolves the `@/…` tsconfig paths):
 *
 * ```sh
 * npx tsx --test "src/app/(private)/lesson-schedules/_utils/lesson-schedule-api.util.test.ts"
 * ```
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LIST_PAGE_SIZE, type ListPaging, fetchAllPages } from './lesson-schedule-api.util';

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
  it('reads every page at the API maximum and concatenates them in order', async () => {
    const { calls, fetchPage } = fakeList(250);
    const rows = await fetchAllPages(fetchPage);
    assert.equal(rows.length, 250);
    assert.deepEqual(rows.slice(0, 3), [0, 1, 2]);
    assert.equal(rows[249], 249);
    assert.deepEqual(calls, [
      { page: 1, limit: LIST_PAGE_SIZE },
      { page: 2, limit: LIST_PAGE_SIZE },
      { page: 3, limit: LIST_PAGE_SIZE },
    ]);
  });

  it('stops after one call when everything fits on the first page', async () => {
    const { calls, fetchPage } = fakeList(22);
    assert.equal((await fetchAllPages(fetchPage)).length, 22);
    assert.equal(calls.length, 1);
  });

  it('makes one call for an empty list', async () => {
    const { calls, fetchPage } = fakeList(0);
    assert.deepEqual(await fetchAllPages(fetchPage), []);
    assert.equal(calls.length, 1);
  });

  it('does not stop at a fixed number of pages', async () => {
    const { calls, fetchPage } = fakeList(25 * LIST_PAGE_SIZE + 1);
    assert.equal((await fetchAllPages(fetchPage)).length, 25 * LIST_PAGE_SIZE + 1);
    assert.equal(calls.length, 26);
  });

  it('propagates a failed page instead of returning a partial list', async () => {
    await assert.rejects(
      fetchAllPages(async (paging) => {
        if (paging.page === 2) throw new Error('E-SYS-001');
        return { items: [1], pagination: { totalPages: 3 } };
      }),
      /E-SYS-001/,
    );
  });
});
