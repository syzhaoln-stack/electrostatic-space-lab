/** Two independent test particles in the same prescribed uniform static field.
 * Both begin at t = 0; the target starts at rest. There are no mutual forces.
 * Units: position mm, time ns, velocity mm/ns (= 10^6 m/s), acceleration
 * mm/ns², field V/m, force N and kinetic energy eV. */
import {CONSTANTS as C} from './physics.js';

export const DEFAULT_AIM = Object.freeze({
  start: Object.freeze([-9, 0, 0]),
  target: Object.freeze([7, 3, 1.6]),
  E: Object.freeze([0, 180, 0]),
  speed: 1.1,
  massUnits: 4,
  pitchOffset: 0,
  yawOffset: 0,
  targetRatio: 1,
  radius: .35,
  samples: 241,
});

const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const finite = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const vector = (v, fallback) => Array.from({length: 3}, (_, i) => finite(v?.[i], fallback[i]));

export function aimOptions(overrides = {}) {
  return {
    start: vector(overrides.start, DEFAULT_AIM.start),
    target: vector(overrides.target, DEFAULT_AIM.target),
    E: vector(overrides.E, DEFAULT_AIM.E),
    speed: Math.max(.05, finite(overrides.speed, DEFAULT_AIM.speed)),
    massUnits: Math.max(.05, finite(overrides.massUnits, DEFAULT_AIM.massUnits)),
    // These are the direction of the entire shot, not beam divergence angles.
    pitchOffset: clamp(finite(overrides.pitchOffset, 0), -15, 15),
    yawOffset: clamp(finite(overrides.yawOffset, 0), -15, 15),
    targetRatio: Math.max(0, finite(overrides.targetRatio, 1)),
    radius: Math.max(0, finite(overrides.radius, DEFAULT_AIM.radius)),
    samples: clamp(Math.round(finite(overrides.samples, DEFAULT_AIM.samples)), 2, 4001),
  };
}

function velocity(o) {
  const d = o.target.map((value, i) => value - o.start[i]);
  const horizontal = Math.hypot(d[0], d[2]);
  const pitch = Math.atan2(d[1], horizontal) + o.pitchOffset * Math.PI / 180;
  const yaw = Math.atan2(d[2], d[0]) + o.yawOffset * Math.PI / 180;
  return [o.speed * Math.cos(pitch) * Math.cos(yaw), o.speed * Math.sin(pitch), o.speed * Math.cos(pitch) * Math.sin(yaw)];
}

/** A zero offset points at the target's original position in three dimensions. */
export function aimVelocity(options = DEFAULT_AIM) {
  return velocity(aimOptions(options));
}

function particleAt(time, start, initialVelocity, charge, mass, E) {
  const acceleration = E.map(component => charge / mass * component * 1e-15);
  const deflection = acceleration.map(a => .5 * a * time * time);
  const freePos = start.map((value, i) => value + initialVelocity[i] * time);
  const pos = freePos.map((value, i) => value + deflection[i]);
  const vel = initialVelocity.map((value, i) => value + acceleration[i] * time);
  return {
    pos, vel, E: [...E], F: E.map(component => charge * component),
    K: .5 * mass * dot(vel, vel) * 1e12 / C.elementaryCharge,
    deflection, freePos, charge, mass, acceleration,
  };
}

function stateAt(time, o, initialVelocity) {
  return {
    time,
    projectile: particleAt(time, o.start, initialVelocity, -C.elementaryCharge, o.massUnits * C.electronMass, o.E),
    // Keeping mass fixed makes the ratio explicit without implying an electron
    // has a variable mass or charge: this target is an ideal trial particle.
    target: particleAt(time, o.target, [0, 0, 0], -C.elementaryCharge * o.targetRatio, o.massUnits * C.electronMass, o.E),
  };
}

export function aimState(time, options = DEFAULT_AIM) {
  const o = aimOptions(options);
  return stateAt(Math.max(0, finite(time, 0)), o, velocity(o));
}

// Find every real root in [0, 1] by splitting a polynomial at the roots of its
// derivative. Unlike a sampled minimum, this also catches narrow approaches
// and multiple extrema, without a time-step-dependent collision result.
function rootsInUnitInterval(coefficients) {
  const c = [...coefficients];
  const scale = Math.max(...c.map(Math.abs), Number.MIN_VALUE);
  while (c.length > 1 && Math.abs(c.at(-1)) <= scale * 1e-15) c.pop();
  if (c.length === 1) return [];
  if (c.length === 2) {
    const root = -c[0] / c[1];
    return root >= 0 && root <= 1 ? [root] : [];
  }
  const evaluate = x => c.reduceRight((result, coefficient) => result * x + coefficient, 0);
  const critical = rootsInUnitInterval(c.slice(1).map((value, i) => value * (i + 1)));
  const cuts = [0, ...critical.filter(x => x > 0 && x < 1), 1].sort((a, b) => a - b);
  const roots = [];
  for (const cut of cuts) if (Math.abs(evaluate(cut)) < scale * 1e-13) roots.push(cut);
  for (let i = 0; i < cuts.length - 1; i++) {
    let lo = cuts[i], hi = cuts[i + 1], flo = evaluate(lo), fhi = evaluate(hi);
    if (flo === 0 || fhi === 0 || Math.sign(flo) === Math.sign(fhi)) continue;
    for (let n = 0; n < 64; n++) {
      const mid = (lo + hi) / 2, fm = evaluate(mid);
      if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; }
      else { hi = mid; fhi = fm; }
    }
    roots.push((lo + hi) / 2);
  }
  return roots.sort((a, b) => a - b).filter((root, i, all) => !i || root - all[i - 1] > 1e-10);
}

export function simulateAim(options = DEFAULT_AIM) {
  const o = aimOptions(options), initialVelocity = velocity(o);
  const delta = o.target.map((value, i) => value - o.start[i]);
  const initialDistance = Math.hypot(...delta);
  const windowDuration = initialDistance / o.speed * 1.4;
  const initial = stateAt(0, o, initialVelocity);
  // Write relative position as A + B u + C u², u = t / windowDuration.
  const B = initialVelocity.map(v => -v * windowDuration);
  const Q = initial.target.acceleration.map((a, i) => .5 * (a - initial.projectile.acceleration[i]) * windowDuration ** 2);
  const derivative = [dot(delta, B), dot(B, B) + 2 * dot(delta, Q), 3 * dot(B, Q), 2 * dot(Q, Q)];
  const candidates = [0, ...rootsInUnitInterval(derivative), 1];
  let bestU = 0, bestSquared = dot(delta, delta);
  for (const u of candidates) {
    const relative = delta.map((value, i) => value + B[i] * u + Q[i] * u * u);
    const squared = dot(relative, relative);
    if (squared < bestSquared - 1e-18) { bestU = u; bestSquared = squared; }
  }
  const duration = bestU * windowDuration;
  const final = stateAt(duration, o, initialVelocity);
  const distance = Math.hypot(...final.target.pos.map((value, i) => value - final.projectile.pos[i]));
  const closest = {...final, distance};
  const sampleCount = duration === 0 ? 1 : o.samples;
  const samples = Array.from({length: sampleCount}, (_, i) => stateAt(sampleCount === 1 ? 0 : duration * i / (sampleCount - 1), o, initialVelocity));
  return {
    options: o, samples, closest, hit: distance <= o.radius + 1e-9,
    duration, windowDuration, initialDistance,
    ...(distance < 1e-7 ? {meetingTime: duration} : {}),
  };
}
