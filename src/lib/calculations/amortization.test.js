import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateEqualPrincipalPayment, calculateMonthlyPayment } from './amortization.js';

test('calculateMonthlyPayment returns a stable spitzer payment', () => {
  const payment = calculateMonthlyPayment(100000, 0.04 / 12, 240);
  assert.ok(Math.abs(payment - 605.98) < 0.5);
});

test('calculateEqualPrincipalPayment keeps principal component fixed', () => {
  const result = calculateEqualPrincipalPayment(120000, 0.05 / 12, 240);
  assert.equal(Math.round(result.monthlyPrincipal), 500);
  assert.ok(result.monthlyPayment > result.monthlyPrincipal);
});
