import test from 'node:test';
import assert from 'node:assert/strict';
import {solveSpherePair,sphereField,sphereReadings,advanceSpark,initialSparkState} from './spark-physics.js';

test('Kelvin images keep both complete sphere surfaces equipotential',()=>{
 for(const gap of [1,3,6]){const m=solveSpherePair(gap);for(let i=0;i<180;i++){const y=1-2*(i+.5)/180,a=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y),n=[r*Math.cos(a),y,r*Math.sin(a)];for(let side=0;side<2;side++){const p=m.centers[side].map((v,j)=>v+20*n[j]),{V,E}=sphereField(m,p,7),normal=E.reduce((s,v,j)=>s+v*n[j],0),tangent=Math.hypot(...E.map((v,j)=>v-normal*n[j]));assert.ok(Math.abs(V-(side===0?7:0))<2e-9);assert.ok(tangent<2e-9);}}}
});
test('capacitance, charge, energy and gap threshold agree dimensionally',()=>{
 const models=[1,3,6].map(g=>solveSpherePair(g));for(const m of models){const a=sphereReadings(m,4),b=sphereReadings(m,8);assert.ok(m.capacitancePF>20/8.9875517923);assert.equal(b.chargeNC,2*a.chargeNC);assert.equal(b.energyUJ,4*a.energyUJ);assert.ok(Math.abs(a.energyUJ-.5*a.chargeNC*4)<1e-12);}
 assert.ok(models[0].capacitancePF>models[1].capacitancePF&&models[1].capacitancePF>models[2].capacitancePF);
 const voltages=models.map(m=>3/m.maxGapFieldPerKV);assert.ok(voltages[0]<voltages[1]&&voltages[1]<voltages[2]);
});
test('constant-current charging reaches threshold, stops source and discharges monotonically',()=>{
 const m=solveSpherePair(3);let s={...initialSparkState(),phase:'charging'};s=advanceSpark(m,s,.25);assert.ok(Math.abs(s.voltageKV-5*.25/m.capacitancePF)<1e-12);
 while(s.phase==='charging')s=advanceSpark(m,s,.01);assert.ok(Math.abs(s.peakVoltageKV*m.maxGapFieldPerKV-3)<1e-12);assert.ok(Math.abs(s.chargingSeconds-m.capacitancePF*s.peakVoltageKV/5)<1e-9);
 for(let i=0;i<400&&s.phase!=='complete';i++){const old=s.voltageKV;s=advanceSpark(m,s,.01);assert.ok(s.voltageKV<=old);}
 assert.equal(s.phase,'complete');assert.equal(s.voltageKV,0);
});
