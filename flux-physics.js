/** Fraction of a uniform charged sphere enclosed by a spherical Gaussian surface.
 * Lengths share one unit. Uses actual overlap volume throughout boundary crossing. */
export function enclosedSphereFraction(R, r, d) {
  if (![R, r, d].every(Number.isFinite) || R <= 0 || r <= 0 || d < 0) throw new RangeError('Positive radii and nonnegative separation required.');
  if (d >= R + r) return 0;
  if (d <= Math.abs(R - r)) return Math.min(1, (R / r) ** 3);
  const overlap = Math.PI * (R + r - d) ** 2 * (d * d + 2 * d * r - 3 * r * r + 2 * d * R + 6 * r * R - 3 * R * R) / (12 * d);
  return Math.max(0, Math.min(1, overlap / (4 * Math.PI * r ** 3 / 3)));
}

/** Forward ray crossings of a centered ellipsoid, in the caller's length unit.
 * The sign uses the ray's direction: +1 exits, -1 enters, 0 is tangent.
 * These geometric markers are illustrative, not a flux quadrature. */
export function rayEllipsoidCrossings(origin, direction, radii) {
  const A = direction.reduce((sum, value, i) => sum + (value / radii[i]) ** 2, 0);
  const B = 2 * direction.reduce((sum, value, i) => sum + origin[i] * value / radii[i] ** 2, 0);
  const C = origin.reduce((sum, value, i) => sum + (value / radii[i]) ** 2, -1);
  const discriminant = B * B - 4 * A * C;
  if (A < 1e-20 || discriminant < -1e-12) return [];
  const root = Math.sqrt(Math.max(0, discriminant));
  const roots = [(-B - root) / (2 * A), (-B + root) / (2 * A)];
  return roots.filter((t, index) => t > 1e-6 && (index === 0 || Math.abs(t - roots[0]) > 1e-6)).map(t => {
    const point = origin.map((value, i) => value + t * direction[i]);
    const normalRaw = point.map((value, i) => value / radii[i] ** 2);
    const normalLength = Math.hypot(...normalRaw);
    const normal = normalRaw.map(value => value / normalLength);
    const dot = direction.reduce((sum, value, i) => sum + value * normal[i], 0);
    return { t, point, normal, sign: Math.abs(dot) < 1e-8 ? 0 : Math.sign(dot) };
  });
}
