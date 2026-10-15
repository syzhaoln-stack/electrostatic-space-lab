import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFluxLine} from './flux-journey.js';
import {enclosedSphereFraction} from './flux-physics.js';
import {gaussianFlux,CONSTANTS} from './physics.js';
import {evaluateFluxGoal} from './flux-goal.js';
const R=2.1,radius=.42,Q=.1,unit=Q*1e-12/CONSTANTS.epsilon0;
const sample=(x,sign=1)=>({line:buildFluxLine([x,0,0],radius,[R,R,R],sign),enclosedFraction:enclosedSphereFraction(R,radius,Math.abs(x)),normalizedFlux:gaussianFlux([0,0,0],[R,R,R],[{pos:[x,0,0],Q:Q*sign,radius}],96,192)/unit});
test('only a fully external positive source with two real crossings and cancelling integrated flux meets the goal',()=>{
 for(const x of [-3.7,3.7]){
  const s=sample(x),r=evaluateFluxGoal(s);assert.equal(r.matched,true);assert.deepEqual(s.line.crossings.map(h=>h.sign),[-1,1]);assert.ok(Math.abs(s.normalizedFlux)<.003);
 }
 for(const x of [0,1.9,2.2])assert.equal(evaluateFluxGoal(sample(x)).matched,false);
 assert.equal(evaluateFluxGoal(sample(-3.7,-1)).matched,false);
});
test('two intersections alone or a zero-looking number cannot complete the flux goal',()=>{
 const external=sample(-3.7);
 assert.equal(evaluateFluxGoal({...external,normalizedFlux:.2}).matched,false);
 assert.equal(evaluateFluxGoal({...external,normalizedFlux:NaN}).matched,false);
 assert.equal(evaluateFluxGoal({...external,enclosedFraction:.05}).matched,false);
 assert.equal(evaluateFluxGoal({...external,line:{...external.line,crossings:external.line.crossings.slice(1)}}).matched,false);
 assert.equal(evaluateFluxGoal({...external,line:{...external.line,crossings:external.line.crossings.map(hit=>({...hit,point:[0,0,0]}))}}).matched,false);
});
