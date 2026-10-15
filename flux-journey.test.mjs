import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFluxLine } from './flux-journey.js';
import { fieldAt } from './physics.js';
for(const sign of [1,-1]){
 test(`external ${sign} charge has one inward and one outward crossing`,()=>{
  const plan=buildFluxLine([-3.7,0,0],.42,[2.1,2.1,2.1],sign);
  assert.deepEqual(plan.crossings.map(hit=>hit.sign),[-1,1]);
  for(const hit of plan.crossings){
   assert.ok(Math.abs(hit.point.reduce((sum,v)=>sum+(v/2.1)**2,0)-1)<1e-12);
   const E=fieldAt(hit.point,[{pos:plan.origin,Q:sign*.1,radius:.42}]).E;
   assert.equal(Math.sign(E.reduce((sum,v,i)=>sum+v*hit.point[i],0)),hit.sign);
  }
 });
 test(`internal ${sign} charge has a single signed crossing`,()=>{
  for(const a of [1.1,2.1,3.3]){
   const plan=buildFluxLine([0,0,0],.42,[a,2.1,2.1],sign);
   assert.deepEqual(plan.crossings.map(hit=>hit.sign),[sign]);
  }
 });
}
test('selected radial line remains finite while finite source crosses surface',()=>{
 for(const x of [-2.1,2.1,...Array.from({length:371},(_,i)=>-3.7+i*.02)]){
  const plan=buildFluxLine([x,0,0],.42,[2.1,2.1,2.1]);
  assert.ok(plan.direction.every(Number.isFinite));assert.ok(plan.end>plan.start);
  assert.ok(plan.crossings.length>=1&&plan.crossings.length<=2);
 }
});
