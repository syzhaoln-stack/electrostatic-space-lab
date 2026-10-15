// Crossing count is a geometric condition only. The independent whole-surface
// integral and enclosed-charge fraction are both required for the goal.
export function evaluateFluxGoal({line,enclosedFraction,normalizedFlux}){
 const hits=line?.crossings??[];
 const completeSourceOutside=line?.outside===true&&Number.isFinite(enclosedFraction)&&enclosedFraction<=1e-10;
 const realCrossings=hits.length===2&&hits.every(hit=>{
  const onSurface=hit.point?.reduce((sum,value,i)=>sum+(value/line.radii[i])**2,0);
  return Number.isFinite(onSurface)&&Math.abs(onSurface-1)<1e-7&&Number.isFinite(hit.t)&&hit.t>0;
 });
 const entersThenExits=realCrossings&&line.sign===1&&hits[0].sign===-1&&hits[1].sign===1&&hits[0].t<hits[1].t;
 const zeroFlux=Number.isFinite(normalizedFlux)&&Math.abs(normalizedFlux)<.003;
 return {matched:completeSourceOutside&&entersThenExits&&zeroFlux,completeSourceOutside,entersThenExits,zeroFlux};
}
