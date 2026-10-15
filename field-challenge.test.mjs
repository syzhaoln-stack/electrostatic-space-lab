import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateFieldChallenge,advanceFieldChallenge,FIELD_CHALLENGES} from './field-challenge.js';
const sources=[{pos:[-1.8,0,0],Q:.3,radius:.24},{pos:[1.8,0,0],Q:.3,radius:.24}];
const evaluate=(id,position,extra={})=>evaluateFieldChallenge(id,{position,sources,...extra});
test('direction goal uses the electron force in world space, not the electric field or camera',()=>{
 assert.equal(evaluate('force-direction',[0,-1.4,0]).matched,true);
 assert.equal(evaluate('force-direction',[0,1.4,0]).matched,false);
 assert.equal(evaluate('force-direction',[0,-1.4,0],{chargeSign:1}).matched,false);
 assert.equal(evaluate('force-direction',[0,-1.4,0],{camera:[0,-10,0]}).matched,true);
 for(const goal of FIELD_CHALLENGES)assert.equal(evaluate(goal.id,goal.start).matched,false);
});
test('plane goal checks the force component and excludes zero fields, near sources and distant points',()=>{
 assert.equal(evaluate('force-plane',[0,1.5,.8]).matched,true);
 assert.equal(evaluate('force-plane',[1.2,.6,.8]).matched,false);
 assert.equal(evaluate('force-plane',[0,0,0]).matched,false);
 assert.equal(evaluate('force-plane',[0,80,0]).matched,false);
 assert.equal(evaluate('force-plane',[1.8,.1,0]).matched,false);
 assert.equal(evaluate('force-plane',[NaN,0,0]).matched,false);
 // Being in an adaptive observation plane is insufficient: this is the fixed YZ plane.
 assert.ok(evaluate('force-plane',[1.2,.6,.8]).deviation>.3);
});
test('a continuous 600 ms hold completes a goal; leaving removes current match but preserves the record',()=>{
 let state;
 for(let i=0;i<5;i++)state=advanceFieldChallenge(state,true,100);
 assert.equal(state.completed,false);
 state=advanceFieldChallenge(state,false,16);assert.equal(state.heldMs,0);
 for(let i=0;i<6;i++)state=advanceFieldChallenge(state,true,100);
 assert.equal(state.completed,true);assert.equal(state.newlyCompleted,true);
 state=advanceFieldChallenge(state,false,16);
 assert.equal(state.matched,false);assert.equal(state.progress,0);assert.equal(state.completed,true);
 assert.equal(advanceFieldChallenge(null,true,8000).completed,false);
});
