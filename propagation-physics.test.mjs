import test from 'node:test';
import assert from 'node:assert/strict';
import { RADIATION, cross, drivenSource, radiationAt } from './propagation-physics.js';
const norm = vector => Math.hypot(...vector);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
test('radiation arrives only after the light-travel delay', () => {
  const delay = 60 / RADIATION.c;
  assert.equal(norm(radiationAt([60, 0, 0], delay - 1e-12).E), 0);
  assert.ok(norm(radiationAt([60, 0, 0], delay + 20e-9).E) > 0);
});
test('E and B are transverse, mutually orthogonal, with outward E cross B', () => {
  const field = radiationAt([30, 20, 10], 200e-9);
  assert.ok(Math.abs(dot(field.E, field.n)) < 1e-15);
  assert.ok(Math.abs(dot(field.B, field.n)) < 1e-20);
  assert.ok(Math.abs(dot(field.E, field.B)) < 1e-22);
  assert.ok(Math.abs(norm(field.E) / norm(field.B) / RADIATION.c - 1) < 1e-12);
  assert.ok(dot(cross(field.E, field.B), field.n) > 0);
});
test('farther probe reproduces the delayed waveform with inverse-distance amplitude', () => {
  const first = radiationAt([30, 0, 0], 180e-9);
  const second = radiationAt([60, 0, 0], 180e-9 + 30 / RADIATION.c);
  assert.ok(Math.abs(first.E[1] - 2 * second.E[1]) < 1e-14);
  assert.ok(Math.abs(second.delay - first.delay - 30 / RADIATION.c) < 1e-20);
});
test('linear source has a radiation null on its oscillation axis', () => {
  assert.equal(norm(radiationAt([0, 30, 0], 200e-9).E), 0);
  assert.ok(norm(radiationAt([30, 0, 0], 200e-9).E) > 0);
});
test('source position, velocity and acceleration remain consistent through switch-on', () => {
  const dt = 1e-13;
  for (const time of [5e-9, 20e-9, 44e-9, 100e-9]) {
    const before = drivenSource(time - dt), after = drivenSource(time + dt), current = drivenSource(time);
    assert.ok(Math.abs((after.position[1] - before.position[1]) / (2 * dt) - current.velocity[1]) < 0.01);
    assert.ok(Math.abs(((after.velocity[1] - before.velocity[1]) / (2 * dt) - current.acceleration[1]) / (RADIATION.amplitude * (2 * Math.PI * RADIATION.frequency) ** 2)) < 1e-8);
  }
  assert.equal(norm(drivenSource(0).acceleration), 0);
  assert.ok(2 * Math.PI * 90e6 * RADIATION.amplitude / RADIATION.c < 0.02);
});
