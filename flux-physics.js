/** Fraction of a uniform charged sphere enclosed by a spherical Gaussian surface.
 * Lengths share one unit. Uses actual overlap volume throughout boundary crossing. */
export function enclosedSphereFraction(R, r, d) {
  if (![R, r, d].every(Number.isFinite) || R <= 0 || r <= 0 || d < 0) throw new RangeError('Positive radii and nonnegative separation required.');
  if (d >= R + r) return 0;
  if (d <= Math.abs(R - r)) return Math.min(1, (R / r) ** 3);
  const overlap = Math.PI * (R + r - d) ** 2 * (d * d + 2 * d * r - 3 * r * r + 2 * d * R + 6 * r * R - 3 * R * R) / (12 * d);
  return Math.max(0, Math.min(1, overlap / (4 * Math.PI * r ** 3 / 3)));
}
