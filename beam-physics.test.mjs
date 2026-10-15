import test from 'node:test';
import assert from 'node:assert/strict';
import {beamOptions,BEAM_LEVELS,makeBeam,beamField,simulateBeam,simulateElectron,gateAt} from './beam-physics.js';
test('fixed seed gives identical independent launch distributions, with real speed and angle spread',()=>{
 const o=beamOptions(1),a=makeBeam(o);assert.deepEqual(a,makeBeam(o));assert.notDeepEqual(a,makeBeam({...o,seed:123}));
 assert.equal(a.length,24);assert.equal(new Set(a.map(p=>p.emitter)).size,2);assert.ok(new Set(a.map(p=>p.velocity[0])).size>20);
});
test('static accelerator and guide including fringe fields equal the negative potential gradient',()=>{
 const o=beamOptions(1,BEAM_LEVELS[1].solution),h=1e-5;
 for(const p of [[-4.4,.4,.2],[-1.9,.8,-.2],[.3,1,-.5],[3,.5,.3]]){const actual=beamField(p,0,o).E;for(let k=0;k<3;k++){const a=[...p],b=[...p];a[k]-=h;b[k]+=h;const expected=-(beamField(b,0,o).V-beamField(a,0,o).V)/(2*h*.001);assert.ok(Math.abs(actual[k]-expected)<.0001,`${actual[k]} vs ${expected}`);}}
});
test('negative electrons gain e times the accelerator voltage; static total mechanical energy is conserved',()=>{
 const o=beamOptions(1,BEAM_LEVELS[1].solution),tr=simulateElectron(makeBeam(o)[0],o);
 assert.ok(Math.abs(tr.afterBoostK-tr.initialK-o.boost)<.001);
 const initial=tr.samples[0].K-tr.samples[0].V;assert.ok(Math.max(...tr.samples.map(s=>Math.abs(s.K-s.V-initial)))<.002);
});
test('all three complete presets genuinely collect the required deterministic batch',()=>{
 for(let level=0;level<3;level++){const r=simulateBeam(beamOptions(level,BEAM_LEVELS[level].solution));assert.equal(r.total,24);assert.ok(r.hits>=18,`level ${level+1}: ${r.hits}`);assert.equal(r.passed,true);for(const t of r.trajectories){assert.ok(t.samples.every(s=>[...s.pos,...s.vel,s.K].every(Number.isFinite)));if(t.hit)assert.ok(t.error<=r.options.radius);}}
});
test('collection uses the circular aperture at actual arrival time, not independent projection boxes',()=>{
 const o=beamOptions(0,{target:[6,0,0],radius:.6,steerY:0,steerZ:0,boost:0}),p={id:0,start:[5,.5,.5],velocity:[1,0,0],launchTime:0};
 const r=simulateElectron(p,o);assert.equal(r.hit,false);assert.ok(r.error>.6);assert.ok(Math.abs(r.samples.at(-1).pos[1])<.6&&Math.abs(r.samples.at(-1).pos[2])<.6);
 const moving=simulateBeam(beamOptions(2,BEAM_LEVELS[2].solution));for(const t of moving.trajectories)assert.deepEqual(t.gate,gateAt(t.arrival,moving.options));
});
test('halving the time step preserves representative landings and outcomes',()=>{
 for(let level=0;level<3;level++){const o=beamOptions(level,BEAM_LEVELS[level].solution),p=makeBeam(o)[7],a=simulateElectron(p,o),b=simulateElectron(p,o,{dt:.0125});assert.ok(Math.hypot(...a.samples.at(-1).pos.map((v,i)=>v-b.samples.at(-1).pos[i]))<.002);assert.ok(Math.abs(a.arrival-b.arrival)<.002);assert.equal(a.hit,b.hit);}
});
