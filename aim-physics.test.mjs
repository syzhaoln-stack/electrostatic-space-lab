import test from 'node:test';
import assert from 'node:assert/strict';
import {CONSTANTS as C} from './physics.js';
import {DEFAULT_AIM, aimOptions, aimVelocity, aimState, simulateAim} from './aim-physics.js';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));

test('equal signed q/m gives identical deflection and a direct-aim meeting in every uniform field direction', () => {
  for (const E of [[0, 180, 0], [75, -260, 95], [-550, 300, -370], [0, 0, 0]]) {
    const o = aimOptions({E}), result = simulateAim(o);
    const expected = distance(o.start, o.target) / o.speed;
    assert.equal(result.hit, true); close(result.meetingTime, expected);
    close(result.closest.distance, 0);
    for (const sample of result.samples) assert.deepEqual(sample.projectile.deflection, sample.target.deflection);
    assert.deepEqual(result.samples.at(-1), aimState(result.duration, o));
    assert.ok(result.windowDuration >= expected * 1.4 - 1e-10);
  }
});

test('different q/m ratios do not share the field deflection and miss when aimed at the original target', () => {
  for (const targetRatio of [0, .5, 2]) {
    const result = simulateAim({targetRatio});
    assert.equal(result.hit, false); assert.ok(result.closest.distance > DEFAULT_AIM.radius);
    assert.equal(result.meetingTime, undefined);
    for (let axis = 0; axis < 3; axis++) close(result.closest.target.deflection[axis], targetRatio * result.closest.projectile.deflection[axis]);
  }
});

test('aiming above, below, or to either side misses an equal-q/m target, while zero offset points at it', () => {
  const straight = aimVelocity(), o = aimOptions(), direction = o.target.map((value, i) => value - o.start[i]);
  for (let axis = 0; axis < 3; axis++) close(straight[axis] / o.speed, direction[axis] / Math.hypot(...direction));
  for (const offset of [{pitchOffset: 5}, {pitchOffset: -5}, {yawOffset: 5}, {yawOffset: -5}]) {
    const r = simulateAim(offset); assert.equal(r.hit, false); assert.ok(r.closest.distance > 1);
  }
});

test('force is qE, acceleration uses millimetres and nanoseconds, and kinetic energy equals field work', () => {
  const o = aimOptions({E: [90, 180, -70], targetRatio: 2});
  const a = aimState(0, o), b = aimState(8, o);
  assert.ok(b.projectile.F[1] < 0 && b.projectile.deflection[1] < 0);
  for (const key of ['projectile', 'target']) {
    const start = a[key], end = b[key];
    for (let axis = 0; axis < 3; axis++) {
      close(end.F[axis], end.charge * o.E[axis], 1e-35);
      close(end.acceleration[axis], end.F[axis] / end.mass * 1e-15);
      close(end.deflection[axis], .5 * end.acceleration[axis] * 64);
      close(end.vel[axis] - start.vel[axis], end.acceleration[axis] * 8);
    }
    const work = end.F.reduce((sum, force, i) => sum + force * (end.pos[i] - start.pos[i]) * .001, 0) / C.elementaryCharge;
    close(end.K - start.K, work);
    close(end.K, .5 * end.mass * Math.hypot(...end.vel) ** 2 * 1e12 / C.elementaryCharge);
  }
});

test('without a field the target remains stationary and every charge ratio permits direct aim', () => {
  for (const targetRatio of [0, .5, 1, 2]) {
    const result = simulateAim({E: [0, 0, 0], targetRatio});
    assert.equal(result.hit, true); assert.deepEqual(result.closest.target.pos, result.options.target);
    assert.deepEqual(result.closest.projectile.pos, result.closest.projectile.freePos);
    close(result.closest.target.K, 0);
  }
});

test('closest approach does not depend on rendering sample count and beats a dense scan', () => {
  for (const overrides of [{targetRatio: 2, pitchOffset: 11}, {targetRatio: 0, yawOffset: -9, E: [85, -350, 200]}, {targetRatio: .5, E: [600, 90, -70]}]) {
    const sparse = simulateAim({...overrides, samples: 2}), dense = simulateAim({...overrides, samples: 1001});
    close(sparse.duration, dense.duration); close(sparse.closest.distance, dense.closest.distance);
    let sampledMinimum = Infinity;
    for (let i = 0; i <= 10000; i++) {
      const state = aimState(sparse.windowDuration * i / 10000, sparse.options);
      sampledMinimum = Math.min(sampledMinimum, distance(state.projectile.pos, state.target.pos));
    }
    assert.ok(sparse.closest.distance <= sampledMinimum + 1e-9);
    assert.ok(sampledMinimum - sparse.closest.distance < .002);
  }
});

test('options own their vectors, render samples are finite, and an initial meeting is handled', () => {
  const first = aimOptions(), second = aimOptions(); first.E[1] = 0;
  assert.equal(second.E[1], 180); assert.equal(DEFAULT_AIM.E[1], 180);
  const result = simulateAim(); assert.equal(result.samples.length, DEFAULT_AIM.samples);
  for (const sample of result.samples) for (const key of ['projectile', 'target']) {
    const p = sample[key]; assert.ok([...p.pos, ...p.vel, ...p.F, ...p.E, ...p.deflection, ...p.freePos, p.K].every(Number.isFinite));
  }
  const coincident = simulateAim({target: [-9, 0, 0]});
  assert.equal(coincident.hit, true); assert.equal(coincident.duration, 0); assert.equal(coincident.samples.length, 1);
});

test('the default four-electron-mass trial particles bend less without losing the equal-q/m meeting', () => {
  assert.equal(DEFAULT_AIM.massUnits, 4);
  const light = simulateAim({massUnits: 1}), medium = simulateAim({massUnits: 2}), heavy = simulateAim();
  for (const result of [light, medium, heavy]) {
    assert.equal(result.hit, true); close(result.duration, light.duration);
    close(result.closest.projectile.mass, result.options.massUnits * C.electronMass, 1e-40);
    assert.deepEqual(result.closest.projectile.deflection, result.closest.target.deflection);
  }
  for (let axis = 0; axis < 3; axis++) {
    close(heavy.closest.projectile.deflection[axis] * 4, light.closest.projectile.deflection[axis]);
    close(medium.closest.projectile.deflection[axis] * 2, light.closest.projectile.deflection[axis]);
  }
  assert.ok(Math.hypot(...heavy.closest.projectile.deflection) < 1);
});
