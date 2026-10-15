/** Low-speed, small-amplitude, far-zone radiation only. All arguments use SI.
 * E_rad = k q [n × (n × a(t-r/c))] / (c² r), B_rad = n × E_rad / c.
 * n and r are measured from the mean source position (electric-dipole limit).
 * Coulomb and induction terms, radiation reaction and material boundaries are omitted.
 */
export const RADIATION = Object.freeze({ c: 299792458, k: 8.9875517923e9, charge: 1e-9, amplitude: 0.01, frequency: 45e6, displayCutoff: 20 });
export function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
export function drivenSource(time, options = {}) {
  const { amplitude = RADIATION.amplitude, frequency = RADIATION.frequency } = options;
  if (frequency <= 0 || !Number.isFinite(frequency) || !Number.isFinite(time)) throw new RangeError('Finite time and positive frequency required.');
  if (time <= 0) return { position: [0, 0, 0], velocity: [0, 0, 0], acceleration: [0, 0, 0] };
  const omega = 2 * Math.PI * frequency, ramp = 2 / frequency, u = Math.min(1, time / ramp);
  // A C² switch-on envelope avoids an artificial impulsive acceleration at t=0.
  const g = 10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5;
  const dg = u < 1 ? (30 * u ** 2 - 60 * u ** 3 + 30 * u ** 4) / ramp : 0;
  const ddg = u < 1 ? (60 * u - 180 * u ** 2 + 120 * u ** 3) / ramp ** 2 : 0;
  const sine = Math.sin(omega * time), cosine = Math.cos(omega * time);
  return {
    position: [0, amplitude * g * sine, 0],
    velocity: [0, amplitude * (dg * sine + omega * g * cosine), 0],
    acceleration: [0, amplitude * (ddg * sine + 2 * omega * dg * cosine - omega ** 2 * g * sine), 0],
  };
}
export function radiationAt(position, time, options = {}) {
  const { charge = RADIATION.charge } = options;
  const radius = Math.hypot(...position);
  if (radius === 0) return { E: [0, 0, 0], B: [0, 0, 0], n: [0, 0, 0], radius, delay: 0, retardedTime: time, withinDisplayRange: false };
  const n = position.map(value => value / radius), delay = radius / RADIATION.c;
  const retardedTime = time - delay, acceleration = drivenSource(retardedTime, options).acceleration;
  const transverse = cross(n, cross(n, acceleration));
  const factor = RADIATION.k * charge / (RADIATION.c ** 2 * radius);
  const E = transverse.map(value => value * factor), B = cross(n, E).map(value => value / RADIATION.c);
  return { E, B, n, radius, delay, retardedTime, withinDisplayRange: radius >= RADIATION.displayCutoff };
}
export function radiationPeak(radius, options = {}) {
  const { charge = RADIATION.charge, amplitude = RADIATION.amplitude, frequency = RADIATION.frequency } = options;
  return RADIATION.k * Math.abs(charge) * amplitude * (2 * Math.PI * frequency) ** 2 / (RADIATION.c ** 2 * radius);
}
