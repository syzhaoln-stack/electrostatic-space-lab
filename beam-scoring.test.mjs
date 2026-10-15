import test from 'node:test';
import assert from 'node:assert/strict';
import {beamScore} from './beam-scoring.js';
test('points use actual arrivals, aperture hits and central alignment, never future landings',()=>{
 const result={options:{radius:1},trajectories:[{id:0,arrival:4,hit:true,error:.1,gate:[6,0,0]},{id:1,arrival:1,hit:true,error:.8,gate:[6,0,0]},{id:2,arrival:3,hit:false,error:2,gate:[6,0,0]},{id:3,arrival:2,hit:true,error:.3,gate:[6,0,0]},{id:4,arrival:5,hit:false}]};
 assert.equal(beamScore(result,0).points,0);assert.equal(beamScore(result,2).points,3);
 assert.deepEqual(beamScore(result),{arrived:5,hits:3,centers:2,points:5,streak:0,longest:2,escaped:1});
});
