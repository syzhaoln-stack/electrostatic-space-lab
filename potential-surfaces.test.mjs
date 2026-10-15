import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldAt} from './physics.js';
import {normalFrame,potentialContributions,farReference} from './potential-normal.js';
import {POTENTIAL_LEVELS,DIPOLE_SOURCES,SINGLE_SOURCE,equipotentialProfile,equipotentialOrbit,orbitPosition,orbitTangent,electrostaticWork,radialRelease,buildSurfaceSweep,surfaceSweepSample,surfacePlaybackRate} from './potential-surfaces.js';
test('all nine layers use the summed potential, including the zero plane',()=>{for(const level of POTENTIAL_LEVELS){const profile=equipotentialProfile(level);for(const [r,y] of profile.points)for(const a of [0,.7,2.1])assert.ok(Math.abs(fieldAt([r*Math.cos(a),y,r*Math.sin(a)],DIPOLE_SOURCES).V-level)<1e-9);if(!level)for(const p of [[0,0,0],[1,0,3],[-3,0,2]])assert.equal(fieldAt(p,DIPOLE_SOURCES).V,0);}});
test('selected orbits keep V fixed and E perpendicular to displacement',()=>{for(const level of POTENTIAL_LEVELS){const orbit=equipotentialOrbit(level),start=orbitPosition(orbit,0);for(let i=0;i<=80;i++){const t=i/80,p=orbitPosition(orbit,t),f=fieldAt(p,DIPOLE_SOURCES),tangent=orbitTangent(orbit,t);assert.ok(Math.abs(f.V-level)<1e-10);assert.ok(Math.abs(f.E.reduce((s,v,k)=>s+v*tangent[k],0))<1e-8);assert.ok(Math.abs(electrostaticWork(start,p,DIPOLE_SOURCES,1))<1e-10);assert.ok(Math.abs(electrostaticWork(start,p,DIPOLE_SOURCES,-1))<1e-10);}}});
test('free radial release gains kinetic energy equal to electric work',()=>{for(const radius of [.8,1.4,2,3.6]){const r=radialRelease(radius);assert.equal(r.samples[0].K,0);assert.equal(r.samples.at(-1).pos[0],4);for(const s of r.samples){const w=electrostaticWork([radius,0,0],s.pos,SINGLE_SOURCE);assert.ok(Math.abs(s.K-w)<2e-6,`${radius}: ${s.K-w}`);}}});

test('zero equipotential plane still carries a nonzero normal field',()=>{const f=fieldAt([1.5,0,0],DIPOLE_SOURCES);assert.equal(f.V,0);assert.equal(f.E[0],0);assert.equal(f.E[2],0);assert.ok(f.E[1]<-500);});
test('click-selected orbits are projected back onto the selected true surface',()=>{for(const level of [-1.4,.8]){const orbit=equipotentialOrbit(level,[1.4,Math.sign(level)*3.2,1.1]);for(let i=0;i<30;i++)assert.ok(Math.abs(fieldAt(orbitPosition(orbit,i/30),DIPOLE_SOURCES).V-level)<1e-10);}});

test('multi-direction sweep stays on each exact surface and is tangent to E',()=>{for(const level of POTENTIAL_LEVELS){const sweep=buildSurfaceSweep({level}),ys=[],rhos=[];for(let i=0;i<=200;i++){const {pos,tangent}=surfaceSweepSample(sweep,i/200),f=fieldAt(pos,DIPOLE_SOURCES);assert.ok(Math.abs(f.V-level)<1e-9);assert.ok(Math.abs(f.E.reduce((sum,v,k)=>sum+v*tangent[k],0))<1e-7);ys.push(pos[1]);rhos.push(Math.hypot(pos[0],pos[2]));}if(level)assert.ok(Math.max(...ys)-Math.min(...ys)>.8);else assert.ok(Math.max(...rhos)-Math.min(...rhos)>3.5);}});
test('single-source sweep covers multiple latitudes while doing no field work',()=>{const sweep=buildSurfaceSweep({mode:'single',radius:2.4}),ys=[];for(let i=0;i<=100;i++){const {pos,tangent}=surfaceSweepSample(sweep,i/100),f=fieldAt(pos,SINGLE_SOURCE);assert.ok(Math.abs(Math.hypot(...pos)-2.4)<1e-10);assert.ok(Math.abs(f.E.reduce((sum,v,k)=>sum+v*tangent[k],0))<1e-8);ys.push(pos[1]);}assert.ok(Math.max(...ys)-Math.min(...ys)>4.4);});

test('surface sweep reaches near both poles while its later time remapping leaves electric work zero',()=>{
 const sweep=buildSurfaceSweep({level:.8}),profile=equipotentialProfile(.8),ys=[];
 for(let i=0;i<=400;i++){const sample=surfaceSweepSample(sweep,i/400);ys.push(sample.pos[1]);assert.ok(Math.abs(electrostaticWork(surfaceSweepSample(sweep,0).pos,sample.pos,DIPOLE_SOURCES))<1e-9);}
 assert.ok((Math.max(...ys)-Math.min(...ys))/(profile.maxY-profile.minY)>.985);
 assert.equal(surfacePlaybackRate(.25),1);assert.ok(surfacePlaybackRate(.65)>2);assert.equal(surfacePlaybackRate(.95),4);
});

test('local direction wheel contains eight tangent directions perpendicular to force for either sign',()=>{
 for(const level of POTENTIAL_LEVELS){const sweep=buildSurfaceSweep({level});for(const progress of [0,.17,.53,.9]){const {pos,tangent}=surfaceSweepSample(sweep,progress),{E}=fieldAt(pos,DIPOLE_SOURCES);for(const q of [-1,1]){const frame=normalFrame(E,tangent,q);assert.equal(frame.directions.length,8);for(const direction of frame.directions){assert.ok(Math.abs(Math.hypot(...direction)-1)<1e-12);assert.ok(Math.abs(direction.reduce((sum,v,i)=>sum+v*E[i]*q,0))<1e-8);}assert.ok(frame.normal.reduce((sum,v,i)=>sum+v*E[i]*q,0)>0);}}}
});
test('zero-plane potential contributions cancel but do not erase the electric field',()=>{
 for(const pos of [[0,0,0],[2,0,1],[-4,0,3]]){const values=potentialContributions(pos,DIPOLE_SOURCES);assert.ok(values[0]>0);assert.ok(values[1]<0);assert.ok(Math.abs(values[0]+values[1])<1e-12);assert.ok(Math.hypot(...fieldAt(pos,DIPOLE_SOURCES).E)>0);}
});
test('finite far reference probe approaches zero potential and zero field for both source models',()=>{
 for(const sources of [SINGLE_SOURCE,DIPOLE_SOURCES]){let previous=farReference(sources,8);for(const distance of [12,20,50,100,200,10000]){const current=farReference(sources,distance);assert.ok(current.V>0&&current.V<previous.V);assert.ok(current.E>0&&current.E<previous.E);assert.ok(Math.abs(Math.hypot(...current.p)-distance)<1e-9);previous=current;}assert.ok(previous.V<.0003);assert.ok(previous.E<.00003);}
});
