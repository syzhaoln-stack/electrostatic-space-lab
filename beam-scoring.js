/** A bonus measures alignment within the actual aperture; it never changes hit physics. */
export function beamScore(result,time=Infinity){
 if(!result)return {arrived:0,hits:0,centers:0,points:0,streak:0,longest:0,escaped:0};
 const arrived=result.trajectories.filter(p=>p.arrival<=time).sort((a,b)=>a.arrival-b.arrival||a.id-b.id);
 let hits=0,centers=0,streak=0,longest=0,escaped=0;
 for(const p of arrived){if(p.hit){hits++;streak++;longest=Math.max(longest,streak);if(p.error<=result.options.radius*.35)centers++;}else streak=0;if(!p.gate)escaped++;}
 return {arrived:arrived.length,hits,centers,points:hits+centers,streak,longest,escaped};
}
