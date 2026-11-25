/**
 * Unit test for the Manager multi-store rules.
 *
 * ```sh
 * npx tsx --test "src/app/(private)/staffs/_utils/store-affiliation.util.test.ts"
 * ```
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  STORE_RESELECT_MESSAGE,
  STORE_SINGLE_ONLY_MESSAGE,
  allowsMultipleStores,
  getStoreSelectionError,
  isSameStoreIds,
  needsStoreReselection,
} from './store-affiliation.util';

describe('allowsMultipleStores', () => {
  it('is true only for manager', () => {
    assert.equal(allowsMultipleStores('manager'), true);
    for (const role of ['system', 'headquarter', 'staff', 'trainer', 'observer', '', undefined]) {
      assert.equal(allowsMultipleStores(role), false);
    }
  });
});

describe('needsStoreReselection', () => {
  it('asks for a reselect when leaving manager with several stores', () => {
    assert.equal(needsStoreReselection('staff', ['a', 'b']), true);
  });
  it('keeps a single store or an empty selection', () => {
    assert.equal(needsStoreReselection('staff', ['a']), false);
    assert.equal(needsStoreReselection('staff', []), false);
  });
  it('never asks when the new role is manager', () => {
    assert.equal(needsStoreReselection('manager', ['a', 'b', 'c']), false);
  });
});

describe('getStoreSelectionError', () => {
  const base = {
    role: 'staff',
    isDirectStore: true,
    storeIds: [] as string[],
    reselectRequired: false,
  };

  it('rejects several stores for a non-manager', () => {
    assert.equal(
      getStoreSelectionError({ ...base, storeIds: ['a', 'b'] }),
      STORE_SINGLE_ONLY_MESSAGE,
    );
  });
  it('accepts several stores for a manager', () => {
    assert.equal(getStoreSelectionError({ ...base, role: 'manager', storeIds: ['a', 'b'] }), null);
  });
  it('requires a store after a role-change reset until one is picked', () => {
    assert.equal(
      getStoreSelectionError({ ...base, reselectRequired: true }),
      STORE_RESELECT_MESSAGE,
    );
    assert.equal(
      getStoreSelectionError({ ...base, reselectRequired: true, storeIds: ['a'] }),
      null,
    );
  });
  it('lifts the reselect demand once the role is manager again', () => {
    assert.equal(
      getStoreSelectionError({ ...base, role: 'manager', reselectRequired: true }),
      null,
    );
  });
  it('ignores the store rules on pattern B', () => {
    assert.equal(
      getStoreSelectionError({
        ...base,
        isDirectStore: false,
        storeIds: ['a', 'b'],
        reselectRequired: true,
      }),
      null,
    );
  });
});

describe('isSameStoreIds', () => {
  it('is order-sensitive because the first id becomes storeId', () => {
    assert.equal(isSameStoreIds(['a', 'b'], ['a', 'b']), true);
    assert.equal(isSameStoreIds(['a', 'b'], ['b', 'a']), false);
    assert.equal(isSameStoreIds(['a'], ['a', 'b']), false);
  });
});
