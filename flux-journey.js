import { rayEllipsoidCrossings } from './flux-physics.js';

/** A selected radial field line of a uniformly charged sphere.
 * Crossings describe direction only. Flux is integrated separately over the complete surface.
 */
export function buildFluxLine(origin, sourceRadius, radii, sign=1) {
  const outside=origin.reduce((sum,value,i)=>sum+(value/radii[i])**2,0)>=1;
  // Aim every selected radial ray through one interior point. This remains
  // continuous as the source crosses the surface and cannot become tangent
  // just inside the boundary, where a sub-pixel exit would otherwise vanish.
  const target=[0,Math.min(radii[1]*0.26,0.55),0];
  const raw=target.map((value,i)=>value-origin[i]);
  const length=Math.hypot(...raw),direction=length>1e-12?raw.map(value=>value/length):[1,0,0];
  // Inside the finite charged ball E is also radial. Keep its surface crossing
  // when the Gaussian surface intersects the ball, even if hidden by the ball glyph.
  let crossings=rayEllipsoidCrossings(origin,direction,radii).filter(hit=>hit.t>1e-8&&hit.sign).map(hit=>({...hit,sign:hit.sign*(sign<0?-1:1)}));
  if(sign<0)crossings.reverse();
  const end=Math.max(sourceRadius+1,...crossings.map(hit=>hit.t+1.05));
  return {origin:[...origin],radii:[...radii],direction,start:sourceRadius+0.025,end,crossings,outside,sign:sign<0?-1:1};
}
