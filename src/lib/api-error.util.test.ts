/**
 * Unit test for `resolveApiErrorMessage` (BUG-021-U3-07).
 *
 * Run with Node's built-in runner through tsx:
 * `npx tsx --test src/lib/api-error.util.test.ts`
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveApiErrorMessage } from './api-error.util';

describe('resolveApiErrorMessage', () => {
  it('uses the status table for a NestJS 404', () => {
    const body = { message: 'x', error: 'Not Found', statusCode: 404, status: 404 };
    assert.equal(resolveApiErrorMessage(body), '対象のデータが見つかりませんでした。');
  });

  it('prefers userMessage', () => {
    assert.equal(
      resolveApiErrorMessage({ userMessage: '日本語', error: 'Not Found', statusCode: 404 }),
      '日本語',
    );
  });
});
