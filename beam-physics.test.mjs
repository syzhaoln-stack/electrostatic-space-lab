import test from 'node:test';
import assert from 'node:assert/strict';
import {BEAM,BEAM_GROUPS,beamOptions,BEAM_LEVELS,makeBeam,beamField,simulateBeam,simulateElectron,gateAt} from './beam-physics.js';
test('fixed seed gives identical independent launch distributions, with real speed and angle spread',()=>{
 const o=beamOptions(1),a=makeBeam(o);assert.deepEqual(a,makeBeam(o));assert.notDeepEqual(a,makeBeam({...o,seed:123}));
 assert.equal(a.length,100);assert.equal(new Set(a.map(p=>p.emitter)).size,2);assert.ok(new Set(a.map(p=>p.velocity[0])).size>20);
});
test('static accelerator and guide with ideal uniform transverse guide equal the negative potential gradient',()=>{
 const o=beamOptions(1,BEAM_LEVELS[1].solution),h=1e-5;
 for(const p of [[-4.4,.4,.2],[-1.9,.8,-.2],[.3,1,-.5],[3,.5,.3]]){const actual=beamField(p,0,o).E;for(let k=0;k<3;k++){const a=[...p],b=[...p];a[k]-=h;b[k]+=h;const expected=-(beamField(b,0,o).V-beamField(a,0,o).V)/(2*h*.001);assert.ok(Math.abs(actual[k]-expected)<.0001,`${actual[k]} vs ${expected}`);}}
});
test('negative electrons gain e times the accelerator voltage; static total mechanical energy is conserved',()=>{
 const o=beamOptions(1,BEAM_LEVELS[1].solution),tr=simulateElectron(makeBeam(o)[0],o);
 const longitudinal=beamOptions(1,{boost:4,steerY:0,steerZ:0});const accelerated=simulateElectron(makeBeam(longitudinal)[0],longitudinal);assert.ok(Math.abs(accelerated.afterBoostK-accelerated.initialK-longitudinal.boost)<.001);
 const initial=tr.samples[0].K-tr.samples[0].V;assert.ok(Math.max(...tr.samples.map(s=>Math.abs(s.K-s.V-initial)))<.002);
});
test('all three complete presets genuinely collect the required deterministic batch',()=>{
 for(let level=0;level<3;level++){const r=simulateBeam(beamOptions(level,BEAM_LEVELS[level].solution));assert.equal(r.total,100);assert.ok(r.hits>=75,`level ${level+1}: ${r.hits}`);assert.equal(r.passed,true);for(const t of r.trajectories){assert.ok(t.samples.every(s=>[...s.pos,...s.vel,s.K].every(Number.isFinite)));if(t.hit)assert.ok(t.error<=r.options.radius);}}
});
test('collection uses the circular aperture at actual arrival time, not independent projection boxes',()=>{
 const o=beamOptions(0,{target:[6,0,0],radius:.6,steerY:0,steerZ:0,boost:0}),p={id:0,start:[5,.5,.5],velocity:[1,0,0],launchTime:0};
 const r=simulateElectron(p,o);assert.equal(r.hit,false);assert.ok(r.error>.6);assert.ok(Math.abs(r.samples.at(-1).pos[1])<.6&&Math.abs(r.samples.at(-1).pos[2])<.6);
 const moving=simulateBeam(beamOptions(2,BEAM_LEVELS[2].solution));for(const t of moving.trajectories)assert.deepEqual(t.gate,gateAt(t.arrival,moving.options));
});
test('halving the time step preserves representative landings and outcomes',()=>{
 for(let level=0;level<3;level++){const o=beamOptions(level,BEAM_LEVELS[level].solution),p=makeBeam(o)[7],a=simulateElectron(p,o),b=simulateElectron(p,o,{dt:.0125});assert.ok(Math.hypot(...a.samples.at(-1).pos.map((v,i)=>v-b.samples.at(-1).pos[i]))<.002);assert.ok(Math.abs(a.arrival-b.arrival)<.002);assert.equal(a.hit,b.hit);}
});

test('ideal infinite guide is uniform everywhere and produces no longitudinal edge force',()=>{
 const o=beamOptions(0,{steerY:95,steerZ:-130,boost:0});for(const p of [[-20,0,0],[-6,2,-1],[-2.2,1,2],[3.3,-2,1],[12,0,0]])assert.deepEqual(beamField(p,0,o).E,[-0,-95,130]);
});
test('uniform transverse guide agrees with analytic constant-acceleration motion',()=>{
 const o=beamOptions(0,{steerY:95,steerZ:-30,boost:0}),p={id:0,start:[-6,0,0],velocity:[1,0,0],launchTime:2},tr=simulateElectron(p,o),end=tr.samples.at(-1),duration=end.time-p.launchTime;
 assert.ok(Math.abs(duration-12)<1e-10);assert.ok(Math.abs(end.vel[0]-1)<1e-12);
 const qOverM=-1.602176634e-19/9.1093837015e-31;for(const axis of [1,2]){const a=beamField(p.start,2,o).E[axis]*qOverM*1e-15;assert.ok(Math.abs(end.pos[axis]-.5*a*duration**2)<2e-6);assert.ok(Math.abs(end.vel[axis]-a*duration)<2e-7);}
});
test('launch angles are tightly bounded and defaults use half-degree divergence',()=>{
 assert.equal(beamOptions(0).spread,.5);for(const p of makeBeam(beamOptions(0))){assert.ok(Math.acos(p.velocity[0]/Math.hypot(...p.velocity))*180/Math.PI<=.5+1e-9);}for(const pitch of [-1,0,1])for(const yaw of [-1,0,1])for(const p of makeBeam(beamOptions(0,{pitch,yaw,spread:1}))){const speed=Math.hypot(...p.velocity);assert.ok(Math.acos(p.velocity[0]/speed)*180/Math.PI<=1+1e-9);assert.ok(Math.abs(Math.asin(p.velocity[1]/speed)*180/Math.PI)<=1+1e-10);assert.ok(Math.abs(Math.atan2(p.velocity[2],p.velocity[0])*180/Math.PI)<=1+1e-10);}
});

test('mixed beam uses two deterministic speed bands without changing electron identity',()=>{const o=beamOptions(0,{profile:'mixed',speedSpread:.02,spread:.5}),particles=makeBeam(o);assert.deepEqual(particles,makeBeam(o));for(const p of particles){const ratio=Math.hypot(...p.velocity)/o.speed;assert.ok(p.id%2===0?ratio>=.83-1e-10&&ratio<=.87+1e-10:ratio>=1.13-1e-10&&ratio<=1.17+1e-10);}assert.equal(particles.length,100);});

test('mass-charge comparison pairs four groups at exactly the same launch conditions',()=>{
 const particles=makeBeam(beamOptions(0,{mode:'comparison'}));assert.equal(particles.length,100);for(const group of ['A','B','C','D'])assert.equal(particles.filter(p=>p.group===group).length,25);
 for(let rank=0;rank<25;rank++){const matched=particles.filter(p=>p.rank===rank);for(const p of matched){assert.deepEqual(p.start,matched[0].start);assert.deepEqual(p.velocity,matched[0].velocity);assert.equal(p.launchTime,matched[0].launchTime);assert.ok(Math.acos(p.velocity[0]/Math.hypot(...p.velocity))*180/Math.PI<=.5+1e-9);}}
});
test('twice the charge doubles deflection, twice the mass halves it, equal q/m gives identical trajectories',()=>{
 const o=beamOptions(0,{mode:'comparison',steerY:70,steerZ:0,boost:0}),base={start:[-6,0,0],velocity:[1,0,0],launchTime:0};const trajectories=BEAM_GROUPS.map((g,id)=>simulateElectron({...base,...g,id},o));const y=trajectories.map(t=>t.samples.at(-1).pos[1]);assert.ok(Math.abs(y[1]/y[0]-2)<1e-10);assert.ok(Math.abs(y[2]/y[0]-.5)<1e-10);assert.equal(y[3],y[0]);
 assert.deepEqual(trajectories[0].samples.map(s=>[s.time,...s.pos,...s.vel]),trajectories[3].samples.map(s=>[s.time,...s.pos,...s.vel]));assert.equal(trajectories[3].initialK,trajectories[0].initialK*2);
});
test('general charge/mass particles conserve K + qV in a static field and gain minus q deltaV longitudinally',()=>{
 for(const group of BEAM_GROUPS){const o=beamOptions(1,{...BEAM_LEVELS[1].solution,mode:'comparison'}),particle={...makeBeam(o)[0],...group},tr=simulateElectron(particle,o),qInE=particle.charge/(-BEAM.charge),initial=tr.samples[0].K+qInE*tr.samples[0].V;for(const s of tr.samples){assert.equal(s.charge,particle.charge);assert.equal(s.mass,particle.mass);assert.ok([s.K,...s.F,...s.E].every(Number.isFinite));}assert.ok(Math.max(...tr.samples.map(s=>Math.abs(s.K+qInE*s.V-initial)))<.002);
 const pure=simulateElectron(particle,{...o,steerY:0,steerZ:0});assert.ok(Math.abs(pure.afterBoostK-pure.initialK-group.chargeUnits*o.boost)<.002);}
});
test('A and D coincide for all paired ranks even in the prescribed time-dependent field',()=>{
 const o=beamOptions(2,{...BEAM_LEVELS[2].solution,mode:'comparison'}),result=simulateBeam(o);for(let rank=0;rank<25;rank++){const a=result.trajectories.find(p=>p.rank===rank&&p.group==='A'),d=result.trajectories.find(p=>p.rank===rank&&p.group==='D');assert.equal(a.arrival,d.arrival);assert.deepEqual(a.samples.map(s=>s.pos),d.samples.map(s=>s.pos));}
});
test('comparison scores never unlock challenge levels even if every particle enters',()=>{
 const result=simulateBeam(beamOptions(0,{mode:'comparison',steerY:0,steerZ:0,target:[6,0,0],radius:2}));assert.equal(result.hits,100);assert.equal(result.passed,false);
});
