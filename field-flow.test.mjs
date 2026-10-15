import test from 'node:test';
import assert from 'node:assert/strict';
import {traceFieldLines} from './field-flow.js';
import {fieldAt} from './physics.js';
const source=(x,q)=>({pos:[x,0,0],Q:q,radius:.24});
test('flow curves follow E for positive, negative, dipole and same-sign sources',()=>{
 for(const sources of [[source(0,.3)],[source(0,-.3)],[source(-1.8,.3),source(1.8,-.3)],[source(-1.8,.3),source(1.8,.3)]]){
  const lines=traceFieldLines(sources);assert.ok(lines.length>20);
  for(const line of lines)for(let j=1;j<line.length;j+=7){const a=line[j-1],b=line[j],v=b.map((x,i)=>x-a[i]),mid=a.map((x,i)=>(x+b[i])/2),e=fieldAt(mid,sources).E;const dot=v.reduce((s,x,i)=>s+x*e[i],0)/(Math.hypot(...v)*Math.hypot(...e));assert.ok(Number.isFinite(dot)&&dot>.96,`incorrect direction ${dot}`);}
 }
});
test('zero sources have no lines; planar curves stay in their actual slice',()=>{
 assert.deepEqual(traceFieldLines([source(0,0)]),[]);
 const lines=traceFieldLines([source(-1.8,.3),source(1.8,.3)],{slice:true});for(const l of lines)for(const p of l)assert.ok(Math.abs(p[2])<1e-12);
});
