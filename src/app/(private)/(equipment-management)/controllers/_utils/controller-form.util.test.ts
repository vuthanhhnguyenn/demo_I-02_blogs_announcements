/**
 * Unit test for the 接点制御装置ID (API-104 `relayId`) handling of the controller form: the schema
 * rule (letters, digits, `_`, `-`; 1–128 chars), the create body carrying it, the PATCH body never
 * carrying it (immutable), and the 409 E-DEV-018 duplicate landing on the field.
 *
 * Run with Node's built-in runner through tsx (which resolves the `@/…` tsconfig paths):
 *
 * ```sh
 * npx tsx --test "src/app/(private)/(equipment-management)/controllers/_utils/controller-form.util.test.ts"
 * ```
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  type ControllerFormValues,
  controllerFormSchema,
} from '../_schemas/controller-form.schema';
import {
  controllerFormValuesToCreateBody,
  controllerFormValuesToPatchBody,
  getControllerFieldError,
} from './controller-form.util';

function values(overrides: Partial<ControllerFormValues> = {}): ControllerFormValues {
  return {
    relayId: 'yashio-rc_01',
    name: 'メインコントローラー',
    storeId: 'store-1',
    location: '受付横',
    ipAddress: '192.168.1.10',
    controlPortCount: '8',
    firmwareVersion: '',
    status: 'normal',
    ...overrides,
  };
}

function relayIdIssues(relayId: string) {
  const result = controllerFormSchema.safeParse(values({ relayId }));
  if (result.success) return [];
  return result.error.issues
    .filter((issue) => issue.path[0] === 'relayId')
    .map((issue) => issue.message);
}

describe('controllerFormSchema relayId', () => {
  it('accepts letters, digits, "_" and "-"', () => {
    assert.deepEqual(relayIdIssues('yashio-rc_01'), []);
    assert.deepEqual(relayIdIssues('ABC_xyz-09'), []);
  });

  it('accepts a backfilled UUID (existing controllers) and exactly 128 chars', () => {
    assert.deepEqual(relayIdIssues('01a1bf39-57c4-73ec-917b-2942db2abaee'), []);
    assert.deepEqual(relayIdIssues('a'.repeat(128)), []);
  });

  it('trims surrounding spaces before checking', () => {
    const result = controllerFormSchema.parse(values({ relayId: '  yashio-rc_01  ' }));
    assert.equal(result.relayId, 'yashio-rc_01');
  });

  it('requires a value (the form shows the first issue)', () => {
    assert.equal(relayIdIssues('')[0], '接点制御装置IDを入力してください');
    assert.equal(relayIdIssues('   ')[0], '接点制御装置IDを入力してください');
  });

  it('rejects more than 128 chars', () => {
    assert.ok(relayIdIssues('a'.repeat(129)).includes('128文字以内で入力してください'));
  });

  it('rejects any other character', () => {
    for (const relayId of ['yashio rc', 'yashio.rc', 'rc/01', '八潮-rc', 'ｒｃ０１', 'rc#1']) {
      assert.deepEqual(
        relayIdIssues(relayId),
        ['半角英数字と「_」「-」のみ入力できます（例: yashio-rc_01）'],
        relayId,
      );
    }
  });
});

describe('controller request bodies', () => {
  it('sends the trimmed relayId on create', () => {
    const parsed = controllerFormSchema.parse(values({ relayId: ' yashio-rc_01 ' }));
    assert.equal(controllerFormValuesToCreateBody(parsed).relayId, 'yashio-rc_01');
  });

  it('never sends relayId on PATCH, even when marked dirty', () => {
    const parsed = controllerFormSchema.parse(values({ relayId: 'changed-id' }));
    const patch = controllerFormValuesToPatchBody(
      parsed,
      { relayId: true, name: true },
      '2026-11-09T00:00:00.000Z',
    );
    assert.equal('relayId' in patch, false);
    assert.equal(patch.name, 'メインコントローラー');
  });
});

describe('getControllerFieldError', () => {
  it('maps 409 E-DEV-018 to the relayId field', () => {
    assert.deepEqual(getControllerFieldError({ statusCode: 409, code: 'E-DEV-018' }), {
      field: 'relayId',
      message: 'この接点制御装置IDはすでに登録されています',
    });
  });

  it('does not map E-DEV-016 (gate tablet certificate) to relayId', () => {
    assert.equal(getControllerFieldError({ statusCode: 409, code: 'E-DEV-016' }), undefined);
  });
});
