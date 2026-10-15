import test from 'node:test';
import assert from 'node:assert/strict';
import {observationFrame} from './field-frame.js';
import {fieldAt} from './physics.js';
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
test('the displayed section contains both sources and an off-axis 3D probe',()=>{
 for(const p of [[0,1.2,.8],[2,-2,1.5],[0,0,0]]){
  const a=[-1.8,0,0],b=[1.8,0,0],f=observationFrame(a,b,p);
  for(const v of [a,b,p])assert.ok(Math.abs(dot(v.map((x,i)=>x-f.origin[i]),f.normal))<1e-12);
  assert.ok(Math.abs(dot(f.u,f.v))<1e-12);assert.ok(Math.abs(Math.hypot(...f.normal)-1)<1e-12);
  const E=fieldAt(p,[{pos:a,Q:.3,radius:.24},{pos:b,Q:-.3,radius:.24}]).E;
  assert.ok(Math.abs(dot(E,f.normal))<1e-8,'Coulomb contributions lie in that same plane');
 }
});
test('a coincident-source plane remains finite and contains the probe',()=>{
 const f=observationFrame([0,0,0],[0,0,0],[0,0,2]);
 assert.ok([...f.u,...f.v,...f.normal].every(Number.isFinite));assert.equal(dot([0,0,2],f.normal),0);
});
