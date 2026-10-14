import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTANTS, SOURCES, LEVELS, makeSources, fieldAt, accelerationAt, simulate, gaussianFlux } from './physics.js';

const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected} ± ${tolerance}`);
const norm = vector => Math.hypot(...vector);

test('external sphere field agrees with Coulomb law and potential', () => {
  const source = { Q: 1, pos: [0, 0, 0], radius: 0.22 };
  const { E, V } = fieldAt([1, 0, 0], [source]);
  close(E[0], CONSTANTS.k * 1e-6, 1e-8);
  close(E[1], 0);
  close(V, CONSTANTS.k * 1e-9, 1e-10);
});

test('solid sphere interior is finite, linear, and continuous at its surface', () => {
  const source = { Q: 1, pos: [0, 0, 0], radius: 0.22 };
  const center = fieldAt([0, 0, 0], [source]);
  const half = fieldAt([0.11, 0, 0], [source]);
  const surface = fieldAt([0.22, 0, 0], [source]);
  close(norm(center.E), 0);
  close(center.V, 1.5 * surface.V);
  close(half.E[0], 0.5 * surface.E[0], 1e-8);
  const inside = fieldAt([0.22 - 1e-9, 0, 0], [source]);
  const outside = fieldAt([0.22 + 1e-9, 0, 0], [source]);
  assert.ok(Math.abs(inside.V - outside.V) < 1e-6);
  assert.ok(Math.abs(inside.E[0] - outside.E[0]) < 0.003);
});

test('opposite pairs obey superposition and correct electron force sign', () => {
  const a = makeSources(0.1, 0);
  const b = makeSources(0, -0.13);
  const both = makeSources(0.1, -0.13);
  const point = [-0.6, 0.3, -0.2];
  const fa = fieldAt(point, a), fb = fieldAt(point, b), fc = fieldAt(point, both);
  for (let i = 0; i < 3; i++) close(fc.E[i], fa.E[i] + fb.E[i], 1e-9);
  close(fc.V, fa.V + fb.V);
  const E = fieldAt([-1.5, 0, 0], a).E;
  const acceleration = accelerationAt([-1.5, 0, 0], a);
  assert.ok(E[1] < 0, 'electric field points away from positive upper sphere');
  assert.ok(acceleration[1] > 0, 'electron accelerates opposite to electric field');
  close(acceleration[1] / E[1], -CONSTANTS.elementaryCharge / CONSTANTS.electronMass * 1e-15, 1e-12);
});

test('potential gradient and field use consistent metric units', () => {
  const sources = makeSources(0.14, -0.08), p = [0.7, 0.3, -0.4], h = 1e-4;
  const E = fieldAt(p, sources).E;
  for (let i = 0; i < 3; i++) {
    const plus = [...p], minus = [...p]; plus[i] += h; minus[i] -= h;
    const negativeGradient = -(fieldAt(plus, sources).V - fieldAt(minus, sources).V) / (2 * h * 1e-3);
    close(E[i], negativeGradient, 1e-5);
  }
});

test('zero field produces uniform rectilinear motion and interpolated target crossing', () => {
  const r = simulate({ speed: 1, timeStep: 0.037 });
  assert.equal(r.outcome, 'hit');
  close(r.duration, 12, 1e-10);
  assert.deepEqual(r.landing.pos, [6, 0, 0]);
  close(r.landing.kineticEV, 2.842815055, 1e-7);
  for (const s of r.samples) close(s.pos[0], -6 + s.t, 1e-9);
});

test('nominal trajectories conserve total electrostatic mechanical energy', () => {
  const r = simulate({ a: 0.098, b: -0.132, sampleEvery: 1 });
  const initialEnergy = r.samples[0].kineticEV - r.samples[0].V;
  const maxError = Math.max(...r.samples.map(s => Math.abs(s.kineticEV - s.V - initialEnergy)));
  assert.ok(maxError < 1e-5, `energy drift ${maxError} eV`);
});

test('smaller integration steps converge at the target plane', () => {
  const shot = { a: 0.098, b: -0.132 };
  const coarse = simulate({ ...shot, timeStep: 0.08 }).landing.pos;
  const standard = simulate({ ...shot, timeStep: 0.02 }).landing.pos;
  const reference = simulate({ ...shot, timeStep: 0.002 }).landing.pos;
  const error = p => norm(p.map((value, i) => value - reference[i]));
  assert.ok(error(standard) < error(coarse));
  assert.ok(error(standard) < 1e-5, `landing error ${error(standard)} mm`);
});

test('three progressive levels are solved by their published charge settings', () => {
  for (const level of LEVELS) {
    const r = simulate({ ...level.solution, speed: level.speed, target: level.target, targetRadius: level.targetRadius });
    assert.equal(r.outcome, 'hit', level.id);
    assert.ok(r.landing.distance < 0.02, `${level.id}: error ${r.landing.distance}`);
    assert.equal(simulate({ speed: level.speed, target: level.target, targetRadius: level.targetRadius }).outcome, 'miss', `${level.id}: zero field must not win`);
  }
});

test('sphere collision stops on the sphere surface, without tunnelling', () => {
  const r = simulate({ pitch: Math.atan2(2.8, 4.5) * 180 / Math.PI, chargeSign: 0 });
  assert.equal(r.outcome, 'collision');
  assert.equal(r.impact.id, SOURCES[0].id);
  close(norm(r.samples.at(-1).pos.map((value, i) => value - SOURCES[0].pos[i])), 0.22, 1e-9);
});

test('escape and timeout are finite and explicit', () => {
  const escape = simulate({ yaw: 70 });
  assert.equal(escape.outcome, 'escape');
  close(escape.samples.at(-1).pos[2], 5);
  const timeout = simulate({ maxTime: 0.1 });
  assert.equal(timeout.outcome, 'timeout');
  close(timeout.duration, 0.1);
});

test('extreme control combinations remain finite and terminate', () => {
  for (const a of [-0.45, 0, 0.45]) for (const b of [-0.45, 0, 0.45]) {
    const r = simulate({ a, b });
    assert.ok(['hit', 'miss', 'collision', 'escape', 'timeout'].includes(r.outcome));
    assert.ok(r.duration <= 40);
    assert.ok(r.samples.every(s => [s.t, ...s.pos, ...s.vel, ...s.E, s.V, s.kineticEV].every(Number.isFinite)));
  }
});

test('ellipsoid quadrature agrees with Gauss law and excludes external charge', () => {
  const internal = { Q: 0.1, pos: [0, 0, 0], radius: 0.22 };
  const external = { Q: 0.14, pos: [5, 1, 0], radius: 0.22 };
  const expected = internal.Q * 1e-12 / CONSTANTS.epsilon0;
  const flux = gaussianFlux([0.5, 0, 0], [1.6, 2.2, 1.8], [internal]);
  const withExternal = gaussianFlux([0.5, 0, 0], [1.6, 2.2, 1.8], [internal, external]);
  assert.ok(Math.abs(flux - expected) / expected < 0.0005);
  assert.ok(Math.abs(withExternal - flux) / expected < 0.0001);
  const outside = gaussianFlux([2.4, 0, 0], [1.2, 2.2, 1.8], [internal]);
  assert.ok(Math.abs(outside) / expected < 0.0005);
});
