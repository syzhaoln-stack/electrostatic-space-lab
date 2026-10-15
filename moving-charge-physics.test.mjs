import test from 'node:test';
import assert from 'node:assert/strict';
import {MOVING_CHARGE as M,movingSource,movingChargeAt} from './moving-charge-physics.js';
import {drivenSource,radiationAt,cross} from './propagation-physics.js';

const norm=v=>Math.hypot(...v);
const relative=(actual,expected,tolerance=1e-11)=>{
 const error=norm(actual.map((v,i)=>v-expected[i]));
 assert.ok(error<=tolerance*Math.max(norm(expected),1e-30),`relative error ${error/Math.max(norm(expected),1e-30)}`);
};
const close=(actual,expected,tolerance)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);

test('a stationary charge has its Coulomb field arbitrarily near and far, with no B or radiation',()=>{
 for(const p of [[.001,0,0],[.2,.3,-.4],[60,-20,10]]){
  const radius=norm(p),expected=p.map(v=>M.k*M.charge*v/radius**3);
  for(const t of [-1e-6,0,1e-6]){
   const f=movingChargeAt(p,t,{amplitude:0});relative(f.E,expected);
   assert.equal(norm(f.radiationE),0);assert.ok(norm(f.B)<1e-20*norm(f.E));
   close(f.delay,radius/M.c,1e-22);
  }
 }
});

test('at instantaneous rest, the acceleration term has its exact Coulomb-plus-transverse form',()=>{
 const tr=2.25/M.frequency,source=movingSource(tr),R=2;
 const observer=[R,source.position[1],0],f=movingChargeAt(observer,tr+R/M.c);
 close(f.retardedTime,tr,2e-21);
 relative(f.nearE,[M.k*M.charge/R**2,0,0],2e-12);
 relative(f.radiationE,[0,-M.k*M.charge*source.acceleration[1]/(M.c**2*R),0],2e-12);
 assert.ok(f.radiationE[1]>0); // positive charge accelerates down, transverse E points up.
});

test('retarded time satisfies the actual moving-source light cone, including points within 20 m',()=>{
 let largestResidual=0;
 for(const time of [-50e-9,0,15e-9,100e-9,230e-9,500e-9]){
  const current=movingSource(time,{frequency:20e6});
  for(const p of [[.001,current.position[1],0],[.3,.7,.2],[2,0,0],[0,-1,0],[30,10,4],[60,0,0]]){
   const f=movingChargeAt(p,time,{frequency:20e6}),state=movingSource(f.retardedTime,{frequency:20e6});
   const distance=norm(p.map((x,i)=>x-state.position[i]));
   const residual=Math.abs(M.c*(time-f.retardedTime)-distance);largestResidual=Math.max(residual,largestResidual);
   assert.ok(residual<5e-12,`light-cone residual ${residual} m`);
   assert.ok(f.retardedTime<=time);assert.ok(f.delay>0);
   assert.ok([...f.E,...f.nearE,...f.radiationE,...f.B].every(Number.isFinite));
  }
 }
 assert.ok(largestResidual<5e-12);
});

test('the total E is the sum of its two terms and B equals n cross E / c',()=>{
 for(const p of [[.01,.02,.03],[.8,-.7,1.2],[40,30,20]]){
  const f=movingChargeAt(p,280e-9);
  relative(f.E,f.nearE.map((v,i)=>v+f.radiationE[i]));
  relative(f.B,cross(f.n,f.E).map(v=>v/M.c));
  assert.equal(f.radE,f.radiationE);
  relative(f.position,movingSource(f.retardedTime).position);
 }
});

test('radiation is zero on the linear oscillation axis, but the full near field remains',()=>{
 for(const y of [-60,-2,2,60]){
  const f=movingChargeAt([0,y,0],250e-9);
  assert.equal(norm(f.radiationE),0);assert.ok(norm(f.E)>0);
  assert.equal(f.E[0],0);assert.equal(f.E[2],0);assert.equal(norm(f.B),0);
 }
 const offAxis=movingChargeAt([2,0,1],250e-9);
 assert.ok(Math.abs(offAxis.E[0])>0);assert.ok(Math.abs(offAxis.E[2])>0);
 assert.ok(norm(offAxis.radiationE)>0);
});

test('in the small-amplitude low-speed far limit, the acceleration term agrees with the existing radiation formula',()=>{
 const options={amplitude:1e-4,frequency:15e6},p=[80,0,25],time=590e-9;
 const full=movingChargeAt(p,time,options),dipole=radiationAt(p,time,options);
 relative(full.radiationE,dipole.E,1e-4);
});

test('no disturbance arrives before the light signal, although the pre-existing Coulomb field remains',()=>{
 const p=[60,0,0],time=60/M.c-1e-9,f=movingChargeAt(p,time);
 assert.ok(f.retardedTime<0);assert.equal(norm(f.radiationE),0);
 relative(f.E,[M.k*M.charge/60**2,0,0]);
});

test('the wrapper reuses the C2 source motion and the full 10–20 MHz UI range stays below 0.13 c',()=>{
 for(const frequency of [10e6,15e6,20e6]){
  let peakBeta=0;
  for(let i=0;i<=2000;i++){
   const t=i/(2000*frequency)*6,source=movingSource(t,{frequency});
   if(i%200===0)assert.deepEqual(source,drivenSource(t,{frequency,amplitude:M.amplitude}));
   peakBeta=Math.max(peakBeta,norm(source.velocity)/M.c);
  }
  assert.ok(peakBeta<.13,`peak beta ${peakBeta}`);
 }
});

test('point singularities and invalid or superluminal parameters fail explicitly without softening',()=>{
 assert.throws(()=>movingChargeAt([0,0,0],0),/singular/);
 const time=230e-9;assert.throws(()=>movingChargeAt(movingSource(time).position,time),/singular/);
 assert.throws(()=>movingChargeAt([1,0,0],0,{frequency:0}),RangeError);
 assert.throws(()=>movingChargeAt([1,0,0],0,{amplitude:10,frequency:20e6}),/subluminal/);
 assert.throws(()=>movingChargeAt([NaN,0,0],0),RangeError);
 assert.throws(()=>movingSource(0,{amplitude:-1}),RangeError);
 const f=movingChargeAt([1e-7,0,0],0);relative(f.E,[M.k*M.charge/1e-14,0,0]);
});
