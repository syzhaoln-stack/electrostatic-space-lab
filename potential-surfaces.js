import {fieldAt,CONSTANTS} from './physics.js';
export const DIPOLE_SOURCES=[{pos:[0,2.4,0],Q:.3,radius:.22,label:'+Q'},{pos:[0,-2.4,0],Q:-.3,radius:.22,label:'−Q'}];
export const SINGLE_SOURCE=[{pos:[0,0,0],Q:.3,radius:.22,label:'Q'}];
export const POTENTIAL_LEVELS=[-2.6,-1.4,-.8,-.45,0,.45,.8,1.4,2.6];
export const SURFACE_TRACE_SEGMENTS=1920;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Playback speeds up only after the first part has been seen. This is a time
// remapping of a constant-speed constrained path, not electric acceleration.
export function surfacePlaybackRate(progress){const x=clamp((progress-.38)/.48,0,1);return 1+3*x*x*(3-2*x);}
const vAt=(r,y)=>fieldAt([r,y,0],DIPOLE_SOURCES).V;
function bisect(fn,a,b){let fa=fn(a);for(let i=0;i<58;i++){const m=(a+b)/2,fm=fn(m);if(fa*fm<=0)b=m;else{a=m;fa=fm;}}return (a+b)/2;}
/** Equal and opposite spherical sources are axially symmetric. At each y>0,
 * V(rho,y) decreases monotonically with rho. Solve the actual sum, not a sphere. */
export function equipotentialProfile(level,segments=72){
 if(!level)return {level,points:[],minY:0,maxY:0};
 const v=Math.abs(level),sign=Math.sign(level),lo=bisect(y=>vAt(0,y)-v,0,2.4),hi=bisect(y=>vAt(0,y)-v,2.4,30),points=[];
 for(let i=0;i<=segments;i++){const y=lo+(hi-lo)*(1-Math.cos(Math.PI*i/segments))/2,r=i===0||i===segments?0:bisect(r=>vAt(r,y)-v,0,30);points.push([r,sign*y]);}
 return {level,points,minY:sign>0?lo:-hi,maxY:sign>0?hi:-lo};
}
export function equipotentialOrbit(level,point=null){
 if(!level){const r=point?clamp(Math.hypot(point[0],point[2]),.8,4.4):2.4,phase=point?Math.atan2(point[2],point[0]):0;return {radius:r,y:0,phase,level};}
 const profile=equipotentialProfile(level),max=profile.points.reduce((a,b)=>a[0]>b[0]?a:b),margin=(profile.maxY-profile.minY)*.05,y=point?clamp(point[1],profile.minY+margin,profile.maxY-margin):max[1],r=bisect(r=>Math.sign(level)*vAt(r,y)-Math.abs(level),0,30);
 return {radius:r,y,phase:point?Math.atan2(point[2],point[0]):0,level};
}
export function orbitPosition(orbit,t){const a=orbit.phase+Math.PI*2*t;return [orbit.radius*Math.cos(a),orbit.y,orbit.radius*Math.sin(a)];}
export function orbitTangent(orbit,t){const a=orbit.phase+Math.PI*2*t;return [-Math.sin(a),0,Math.cos(a)];}
export function electrostaticWork(start,end,sources,chargeSign=1){return chargeSign*(fieldAt(start,sources).V-fieldAt(end,sources).V);}
/** Positive unit-charge test particle with electron mass, released from rest.
 * RK4 in mm/ns; K in eV. This is a free trajectory, not a prescribed animation. */
export function radialRelease(radius,{dt=.008}={}){
 let x=radius,v=0,t=0;const initial=fieldAt([radius,0,0],SINGLE_SOURCE).V,samples=[];
 const acceleration=x=>fieldAt([x,0,0],SINGLE_SOURCE).E[0]*CONSTANTS.elementaryCharge/CONSTANTS.electronMass*1e-15;
 const sample=()=>({t,pos:[x,0,0],vel:[v,0,0],K:.5*CONSTANTS.electronMass*v*v*1e12/CONSTANTS.elementaryCharge,V:fieldAt([x,0,0],SINGLE_SOURCE).V});samples.push(sample());
 while(x<4&&t<80){const k1=[v,acceleration(x)],k2=[v+dt*k1[1]/2,acceleration(x+dt*k1[0]/2)],k3=[v+dt*k2[1]/2,acceleration(x+dt*k2[0]/2)],k4=[v+dt*k3[1],acceleration(x+dt*k3[0])];const nx=x+dt*(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6,nv=v+dt*(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6;
 if(nx>=4){const f=(4-x)/(nx-x);t+=dt*f;v+=(nv-v)*f;x=4;samples.push(sample());break;}x=nx;v=nv;t+=dt;samples.push(sample());}
 return {samples,duration:t,initial};
}
export function releaseSample(release,progress){const time=clamp(progress,0,1)*release.duration,a=release.samples;let lo=0,hi=a.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(a[m].t<=time)lo=m;else hi=m;}const f=(time-a[lo].t)/(a[hi].t-a[lo].t||1),lerp=(x,y)=>x+(y-x)*f;return {t:time,pos:a[lo].pos.map((v,i)=>lerp(v,a[hi].pos[i])),vel:a[lo].vel.map((v,i)=>lerp(v,a[hi].vel[i])),K:lerp(a[lo].K,a[hi].K),V:lerp(a[lo].V,a[hi].V)};}

/** A multi-direction path on one level set. Arc-length lookup makes the
 * constrained animation advance at constant speed, rather than treating the
 * arbitrary parameter as physical time. Each displayed point is solved anew
 * on V=constant; the tangent is differentiated using E·dr=0. */
export function buildSurfaceSweep({mode='pair',level=.8,radius=2.4,start=null}={}){
 const orbit=mode==='pair'?equipotentialOrbit(level,start):{radius,y:0,phase:0},sweep={mode,level,radius,phase:orbit.phase||0,turns:28};
 if(mode==='single'){sweep.mid=0;sweep.amplitude=radius*.985;sweep.phaseY=0;}
 else if(level){const profile=equipotentialProfile(level);sweep.mid=(profile.minY+profile.maxY)/2;sweep.amplitude=(profile.maxY-profile.minY)*.495;sweep.phaseY=Math.asin(clamp((orbit.y-sweep.mid)/sweep.amplitude,-1,1));}
 else{sweep.mid=2.45;sweep.amplitude=2;sweep.phaseY=start?Math.asin(clamp((orbit.radius-sweep.mid)/sweep.amplitude,-1,1)):-Math.PI/2;}
 const arc=[0];let last=rawSweepSample(sweep,0).pos;
 for(let i=1;i<=SURFACE_TRACE_SEGMENTS;i++){const pos=rawSweepSample(sweep,i/SURFACE_TRACE_SEGMENTS).pos;arc.push(arc.at(-1)+Math.hypot(...pos.map((v,k)=>v-last[k])));last=pos;}
 sweep.arc=arc;sweep.length=arc.at(-1);return sweep;
}
function rawSweepSample(sweep,u){
 const phi=sweep.phase+2*Math.PI*sweep.turns*u,dphi=2*Math.PI*sweep.turns,a=sweep.phaseY+2*Math.PI*u;
 let rho,y,drho,dy;
 if(sweep.mode==='pair'&&!sweep.level){rho=sweep.mid+sweep.amplitude*Math.sin(a);drho=sweep.amplitude*Math.cos(a)*2*Math.PI;y=dy=0;}
 else{y=sweep.mid+sweep.amplitude*Math.sin(a);dy=sweep.amplitude*Math.cos(a)*2*Math.PI;
  if(sweep.mode==='single'){rho=Math.sqrt(Math.max(1e-12,sweep.radius*sweep.radius-y*y));drho=-y*dy/rho;}
  else{rho=bisect(r=>Math.sign(sweep.level)*vAt(r,y)-Math.abs(sweep.level),0,30);const E=fieldAt([rho,y,0],DIPOLE_SOURCES).E;drho=-E[1]*dy/E[0];}
 }
 const c=Math.cos(phi),sn=Math.sin(phi),pos=[rho*c,y,rho*sn],d=[drho*c-rho*sn*dphi,dy,drho*sn+rho*c*dphi],norm=Math.hypot(...d);
 return {pos,tangent:d.map(v=>v/norm),parameter:u};
}
export function surfaceSweepSample(sweep,progress){
 const arc=sweep.arc,target=clamp(progress,0,1)*sweep.length;let lo=0,hi=arc.length-1;
 while(hi-lo>1){const m=(lo+hi)>>1;if(arc[m]<=target)lo=m;else hi=m;}
 const f=(target-arc[lo])/(arc[hi]-arc[lo]||1),u=(lo+f)/(arc.length-1);return rawSweepSample(sweep,u);
}
