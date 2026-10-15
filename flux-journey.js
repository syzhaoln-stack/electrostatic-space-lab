import { rayEllipsoidCrossings } from './flux-physics.js';

/** A selected radial field line of one positive, uniformly charged sphere.
 * This path is a camera guide, not a particle trajectory or a flux weight.
 * The ray is chosen to intersect the Gaussian surface; other external rays may miss it.
 */
export function buildFluxJourney(origin, sourceRadius, radii) {
  const outside = origin.reduce((sum, value, i) => sum + (value / radii[i]) ** 2, 0) > 1;
  const target = outside ? [0, 0.55, 0] : [radii[0], 0.4, 0];
  const raw = target.map((value, i) => value - origin[i]);
  const length = Math.hypot(...raw), direction = raw.map(value => value / length);
  const start = sourceRadius + 0.08;
  const crossings = rayEllipsoidCrossings(origin, direction, radii).filter(hit => hit.t > start && hit.sign);
  if (!crossings.length) throw new Error('The selected line must cross the surface.');
  const end = crossings.at(-1).t + 1.05;
  return { origin: [...origin], radii: [...radii], direction, start, end, crossings, outside };
}

export function journeySample(plan, progress) {
  const t = plan.start + Math.max(0, Math.min(1, progress)) * (plan.end - plan.start);
  const point = plan.origin.map((value, i) => value + plan.direction[i] * t);
  const nearby = plan.crossings.find(hit => Math.abs(hit.t - t) < 0.16);
  const entered = plan.crossings.some(hit => hit.sign < 0 && t >= hit.t);
  const exited = plan.crossings.some(hit => hit.sign > 0 && t >= hit.t);
  const inside = point.reduce((sum, value, i) => sum + (value / plan.radii[i]) ** 2, 0) < 1;
  const phase = nearby ? nearby.sign < 0 ? 'enter' : 'exit' : inside ? 'inside' : exited ? 'after' : 'before';
  return { point, t, phase, entered, exited, inside };
}
