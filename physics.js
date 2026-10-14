/**
 * Electrostatic particle golf. Model units: mm, ns, pC; outputs E in V/m, V in V.
 * Sources are FIXED, uniformly charged insulating solid spheres. The electron is
 * a test particle: it does not redistribute the source charges. No magnetic,
 * radiation, image-charge, air-collision or gravitational effects are included.
 */
export const CONSTANTS = Object.freeze({
  k: 8.9875517923e9,
  epsilon0: 1 / (4 * Math.PI * 8.9875517923e9),
  elementaryCharge: 1.602176634e-19,
  electronMass: 9.1093837139e-31,
  sourceRadius: 0.22,
  start: Object.freeze([-6, 0, 0]),
  bounds: Object.freeze([[-8, 8], [-5, 5], [-5, 5]]),
});

export const SOURCES = Object.freeze([
  { id: 'A+', label: 'A 上方球', pair: 'a', polarity: 1, pos: [-1.5, 2.8, 0], radius: 0.22 },
  { id: 'A−', label: 'A 下方球', pair: 'a', polarity: -1, pos: [-1.5, -2.8, 0], radius: 0.22 },
  { id: 'B+', label: 'B 前方球', pair: 'b', polarity: 1, pos: [1.5, 0, 2.8], radius: 0.22 },
  { id: 'B−', label: 'B 后方球', pair: 'b', polarity: -1, pos: [1.5, 0, -2.8], radius: 0.22 },
].map(source => Object.freeze({ ...source, pos: Object.freeze(source.pos) })));

const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const norm = v => Math.hypot(...v);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lerp = (a, b, f) => a.map((x, i) => x + (b[i] - x) * f);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function makeSources(a = 0, b = 0) {
  const amplitudes = { a: finite(a, 0), b: finite(b, 0) };
  return SOURCES.map(source => ({ ...source, pos: [...source.pos], Q: amplitudes[source.pair] * source.polarity }));
}

/** Exact sphere field, including the nonsingular field INSIDE the solid sphere. */
export function fieldAt(pos, sources = makeSources()) {
  const E = [0, 0, 0];
  let V = 0;
  for (const source of sources) {
    const Q = source.Q * 1e-12;
    if (!Q) continue;
    const d = pos.map((value, i) => (value - source.pos[i]) * 1e-3);
    const r = norm(d);
    const R = (source.radius ?? CONSTANTS.sourceRadius) * 1e-3;
    const coefficient = CONSTANTS.k * Q / Math.pow(Math.max(r, R), 3);
    for (let i = 0; i < 3; i++) E[i] += coefficient * d[i];
    V += r >= R
      ? CONSTANTS.k * Q / r
      : CONSTANTS.k * Q * (3 * R * R - r * r) / (2 * R * R * R);
  }
  return { E, V };
}

function kineticEV(vel) {
  return 0.5 * CONSTANTS.electronMass * norm(vel) ** 2 * 1e12 / CONSTANTS.elementaryCharge;
}

function sample(t, pos, vel, sources) {
  return { t, pos: [...pos], vel: [...vel], ...fieldAt(pos, sources), kineticEV: kineticEV(vel) };
}

/** Physical acceleration in mm/ns². chargeSign=-1 is an electron, +1 a positron. */
export function accelerationAt(pos, sources, chargeSign = -1) {
  const factor = chargeSign * CONSTANTS.elementaryCharge / CONSTANTS.electronMass * 1e-15;
  return fieldAt(pos, sources).E.map(component => component * factor);
}

/** Closed ellipsoid flux quadrature, in V·m. Positions/radii are in mm. */
export function gaussianFlux(center, radii, sources, uSteps = 64, phiSteps = 128) {
  const [a, b, c] = radii;
  const du = 2 / uSteps, dPhi = 2 * Math.PI / phiSteps;
  let flux = 0;
  for (let j = 0; j < uSteps; j++) {
    const u = -1 + (j + 0.5) * du, radial = Math.sqrt(1 - u * u);
    for (let i = 0; i < phiSteps; i++) {
      const phi = (i + 0.5) * dPhi;
      const n = [radial * Math.cos(phi), u, radial * Math.sin(phi)];
      const p = [center[0] + a * n[0], center[1] + b * n[1], center[2] + c * n[2]];
      const E = fieldAt(p, sources).E;
      // det(A) A^(-T) n dOmega; mm² → m².
      flux += (E[0] * b * c * n[0] + E[1] * a * c * n[1] + E[2] * a * b * n[2]) * du * dPhi * 1e-6;
    }
  }
  return flux;
}

function derivative(state, sources, chargeSign) {
  return [...state.slice(3), ...accelerationAt(state.slice(0, 3), sources, chargeSign)];
}

export function rk4Step(pos, vel, dt, sources, chargeSign = -1) {
  const state = [...pos, ...vel];
  const add = (k, scale) => state.map((value, i) => value + scale * k[i]);
  const k1 = derivative(state, sources, chargeSign);
  const k2 = derivative(add(k1, dt / 2), sources, chargeSign);
  const k3 = derivative(add(k2, dt / 2), sources, chargeSign);
  const k4 = derivative(add(k3, dt), sources, chargeSign);
  const result = state.map((value, i) => value + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
  return { pos: result.slice(0, 3), vel: result.slice(3) };
}

function segmentSphereFraction(p, next, source) {
  const d = next.map((value, i) => value - p[i]);
  const v = p.map((value, i) => value - source.pos[i]);
  const R = source.radius ?? CONSTANTS.sourceRadius;
  const a = d.reduce((sum, value) => sum + value * value, 0);
  const b = 2 * d.reduce((sum, value, i) => sum + value * v[i], 0);
  const c = v.reduce((sum, value) => sum + value * value, 0) - R * R;
  if (c <= 0) return 0;
  const discriminant = b * b - 4 * a * c;
  if (a === 0 || discriminant < 0) return Infinity;
  const f = (-b - Math.sqrt(discriminant)) / (2 * a);
  return f >= 0 && f <= 1 ? f : Infinity;
}

function nearestOnSegment(p, next, target) {
  const d = next.map((value, i) => value - p[i]);
  const length2 = d.reduce((sum, value) => sum + value * value, 0);
  const f = length2 ? clamp(d.reduce((sum, value, i) => sum + value * (target[i] - p[i]), 0) / length2, 0, 1) : 0;
  return distance(lerp(p, next, f), target);
}

/**
 * pitch rotates toward +y, yaw toward +z. All angles are degrees.
 * The target is a circular aperture in the plane x=target[0]. Every forward
 * crossing finishes the shot, and the y/z distance decides hit versus miss.
 * The small step adapts near a source; a source collision absorbs the particle.
 */
export function simulate(options = {}) {
  const {
    a = 0, b = 0, target = [6, 0, 0], sources = makeSources(a, b),
    chargeSign = -1, targetRadius = 0.45, maxTime = 40,
    sampleEvery = 2, start = CONSTANTS.start, bounds = CONSTANTS.bounds,
  } = options;
  const speed = clamp(finite(options.speed, 1), 0.01, 10);
  const pitch = finite(options.pitch, 0) * Math.PI / 180;
  const yaw = finite(options.yaw, 0) * Math.PI / 180;
  const maxStep = clamp(finite(options.timeStep, 0.02), 0.0001, 0.1);
  let pos = [...start];
  let vel = [speed * Math.cos(pitch) * Math.cos(yaw), speed * Math.sin(pitch), speed * Math.cos(pitch) * Math.sin(yaw)];
  let t = 0;
  let minDistance = distance(pos, target);
  const samples = [sample(t, pos, vel, sources)];
  const result = { samples, outcome: 'timeout', landing: null, impact: null, minDistance, duration: 0, sources };
  let step = 0;

  while (t < maxTime && step < 200000) {
    // Resolve rapid curvature near the absorbing source surfaces.
    let dt = Math.min(maxStep, maxTime - t);
    for (const source of sources) {
      const r = distance(pos, source.pos);
      dt = Math.min(dt, Math.max(0.00005, r * 0.035 / Math.max(norm(vel), 0.1)));
    }
    const next = rk4Step(pos, vel, dt, sources, chargeSign);
    let eventFraction = Infinity;
    let outcome = null;
    let impact = null;

    for (const source of sources) {
      const f = segmentSphereFraction(pos, next.pos, source);
      if (f < eventFraction) { eventFraction = f; outcome = 'collision'; impact = source; }
    }
    if (pos[0] < target[0] && next.pos[0] >= target[0]) {
      const f = (target[0] - pos[0]) / (next.pos[0] - pos[0]);
      if (f < eventFraction) { eventFraction = f; outcome = 'target'; }
    }
    for (let i = 0; i < 3; i++) {
      for (const bound of bounds[i]) {
        const outside = bound === bounds[i][0] ? next.pos[i] < bound : next.pos[i] > bound;
        if (!outside) continue;
        const f = next.pos[i] === pos[i] ? 0 : (bound - pos[i]) / (next.pos[i] - pos[i]);
        if (f >= 0 && f < eventFraction) { eventFraction = f; outcome = 'escape'; }
      }
    }

    if (outcome) {
      const eventPos = lerp(pos, next.pos, eventFraction);
      const eventVel = lerp(vel, next.vel, eventFraction);
      const eventTime = t + dt * eventFraction;
      minDistance = Math.min(minDistance, nearestOnSegment(pos, eventPos, target));
      const last = sample(eventTime, eventPos, eventVel, sources);
      samples.push(last);
      result.outcome = outcome;
      result.impact = outcome === 'collision' ? impact : null;
      if (outcome === 'target') {
        const error = Math.hypot(eventPos[1] - target[1], eventPos[2] - target[2]);
        result.outcome = error <= targetRadius ? 'hit' : 'miss';
        result.landing = { ...last, distance: error };
      }
      result.minDistance = minDistance;
      result.duration = eventTime;
      return result;
    }

    minDistance = Math.min(minDistance, nearestOnSegment(pos, next.pos, target));
    pos = next.pos;
    vel = next.vel;
    t += dt;
    step++;
    if (step % Math.max(1, sampleEvery) === 0) samples.push(sample(t, pos, vel, sources));
  }
  if (samples.at(-1).t !== t) samples.push(sample(t, pos, vel, sources));
  result.minDistance = minDistance;
  result.duration = t;
  return result;
}

// Solutions and targets are checked by physics.test.mjs; replacing the model
// requires recalibrating these targets rather than scripting the flight path.
export const LEVELS = [
  { id: 'bend', title: '任务一 · 改变去向', target: [6, 1.4, 0], targetRadius: 0.45, controls: ['a'], speed: 1, solution: { a: 0.095, b: 0 }, description: '只调 A 组电荷，让电子穿过上方靶环。' },
  { id: 'depth', title: '任务二 · 走进第三维', target: [6, 1.4, -1.25], targetRadius: 0.45, controls: ['a', 'b'], speed: 1, solution: { a: 0.098, b: -0.132 }, description: '靶环移到了侧后方。转动视角，再用两组电荷共同引导。' },
  { id: 'speed', title: '任务三 · 改变速度', target: [6, 1.4, -1.25], targetRadius: 0.45, controls: ['a', 'b', 'speed'], speed: 1.4, solution: { a: 0.192, b: -0.258, speed: 1.4 }, description: '沿用上一关附近的电荷组合，保持目标不变，只提高速度。先观察落点，再重新调整。' },
];
