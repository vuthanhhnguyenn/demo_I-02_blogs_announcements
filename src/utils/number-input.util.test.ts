/**
 * Unit test for `toWholeNumberText` — D-03 Bug-No7: 物理定員 / バッファ値 took `9.88` / `-5`
 * when typed with the IME (full-width `９．８８` / `－５`), because only plain key presses were
 * filtered. Every change is now checked as a whole: digits are kept, anything else is refused.
 *
 * ```sh
 * npx tsx src/utils/number-input.util.test.ts
 * ```
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toWholeNumberText } from './number-input.util';

describe('toWholeNumberText', () => {
  it('keeps half-width digits and blank', () => {
    assert.equal(toWholeNumberText('12'), '12');
    assert.equal(toWholeNumberText('1033333333333'), '1033333333333');
    assert.equal(toWholeNumberText(''), '');
  });

  it('turns full-width IME digits into half-width', () => {
    assert.equal(toWholeNumberText('１２'), '12');
    assert.equal(toWholeNumberText('9８'), '98');
  });

  it('refuses decimals, negatives, exponents and text — half-width or full-width', () => {
    for (const raw of ['9.88', '９．８８', '-123', '－５', '+5', '1e3', 'abc', 'á', '1 2', '12a']) {
      assert.equal(toWholeNumberText(raw), null, raw);
    }
  });

  it('refuses a number too big to keep exact (no rounding, no `1e+21` stuck field)', () => {
    assert.equal(toWholeNumberText('9007199254740991'), '9007199254740991');
    assert.equal(toWholeNumberText('9007199254740992'), null);
    assert.equal(toWholeNumberText('12345678901234567'), null);
    assert.equal(toWholeNumberText('1000000000000000000000'), null);
    assert.equal(toWholeNumberText('１００００００００００００００００００００００'), null);
  });
});
