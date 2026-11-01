import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ORDER_QUANTITY, MIN_ORDER_QUANTITY, validateOrderQuantity } from '../../src/lib/orders/rules.ts';

test('accepts the boundaries', () => {
  assert.equal(validateOrderQuantity(MIN_ORDER_QUANTITY), null);
  assert.equal(validateOrderQuantity(MAX_ORDER_QUANTITY), null);
});

test('rejects out-of-range and non-integer values', () => {
  for (const bad of [0, -5, MIN_ORDER_QUANTITY - 1, MAX_ORDER_QUANTITY + 1, 1_000_000, 50.5, NaN, Infinity]) {
    assert.notEqual(validateOrderQuantity(bad), null, String(bad));
  }
});
