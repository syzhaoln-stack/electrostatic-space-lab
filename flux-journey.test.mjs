import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFluxJourney, journeySample } from './flux-journey.js';
import { fieldAt } from './physics.js';

test('external-source camera path follows E and crosses inward then outward', () => {
  const source = { pos: [-3.7, 0, 0], radius: 0.42, Q: 0.1 };
  const plan = buildFluxJourney(source.pos, source.radius, [2.1, 2.1, 2.1]);
  assert.deepEqual(plan.crossings.map(hit => hit.sign), [-1, 1]);
  for (const hit of plan.crossings) {
    assert.ok(Math.abs(hit.point.reduce((sum, v) => sum + (v / 2.1) ** 2, 0) - 1) < 1e-12);
    const p = (hit.t - plan.start) / (plan.end - plan.start);
    assert.equal(journeySample(plan, p).phase, hit.sign < 0 ? 'enter' : 'exit');
  }
  for (let p = 0; p <= 1; p += 0.05) {
    const { point } = journeySample(plan, p), E = fieldAt(point, [source]).E;
    const cosine = E.reduce((sum, value, i) => sum + value * plan.direction[i], 0) / Math.hypot(...E);
    assert.ok(Math.abs(cosine - 1) < 1e-12);
  }
  assert.equal(journeySample(plan, 0).phase, 'before');
  assert.equal(journeySample(plan, 1).phase, 'after');
});

test('internal positive source exits once; deformed surface preserves exact intersections', () => {
  for (const a of [1.1, 2.1, 3.3]) {
    const plan = buildFluxJourney([0, 0, 0], 0.42, [a, 2.1, 2.1]);
    assert.deepEqual(plan.crossings.map(hit => hit.sign), [1]);
    assert.equal(journeySample(plan, 0).phase, 'inside');
    assert.equal(journeySample(plan, 1).phase, 'after');
    assert.ok(Math.abs(plan.crossings[0].point.reduce((s, v, i) => s + (v / plan.radii[i]) ** 2, 0) - 1) < 1e-12);
  }
});
