import test from 'node:test';
import assert from 'node:assert/strict';
import { enclosedSphereFraction } from './flux-physics.js';
import { gaussianFlux, CONSTANTS } from './physics.js';
test('finite sphere overlap is continuous, monotonic and bounded', () => {
  assert.equal(enclosedSphereFraction(2.1, 0.42, 3.7), 0);
  assert.equal(enclosedSphereFraction(2.1, 0.42, 0), 1);
  assert.equal(enclosedSphereFraction(2.1, 0.42, 2.52), 0);
  assert.ok(Math.abs(enclosedSphereFraction(2.1, 0.42, 1.68) - 1) < 1e-12);
  let previous = 0;
  for (let d = 2.52; d >= 1.68; d -= 0.002) {
    const fraction = enclosedSphereFraction(2.1, 0.42, d);
    assert.ok(fraction >= previous - 1e-12 && fraction <= 1);
    assert.ok(fraction - previous < 0.006); previous = fraction;
  }
});
test('curved boundary does not falsely enclose half the ball at center crossing', () => {
  assert.ok(Math.abs(enclosedSphereFraction(2.1, 0.42, 2.1) - 0.4625) < 1e-12);
  assert.ok(Math.abs(enclosedSphereFraction(1, 2, 0) - 1 / 8) < 1e-12);
});
test('independent surface quadrature agrees with enclosed charge through crossing', () => {
  const unit = 0.1e-12 / CONSTANTS.epsilon0;
  for (const x of [-3.7, -2.5, -2.3, -2.1, -1.9, -1.7, 0]) {
    const flux = gaussianFlux([0, 0, 0], [2.1, 2.1, 2.1], [{ pos: [x, 0, 0], radius: 0.42, Q: 0.1 }], 96, 192) / unit;
    const enclosed = enclosedSphereFraction(2.1, 0.42, Math.abs(x));
    assert.ok(Math.abs(flux - enclosed) < 0.0003, `x=${x}, flux=${flux}, enclosed=${enclosed}`);
  }
});
test('deforming closed surface preserves flux', () => {
  const unit = 0.1e-12 / CONSTANTS.epsilon0;
  for (const a of [1.1, 1.6, 2.1, 2.7, 3.3]) {
    const flux = gaussianFlux([0, 0, 0], [a, 2.1, 2.1], [{ pos: [0, 0, 0], radius: 0.42, Q: 0.1 }], 96, 192) / unit;
    assert.ok(Math.abs(flux - 1) < 0.0001, `a=${a}: flux ${flux}`);
  }
});
