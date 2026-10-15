import {fieldAt} from './physics.js';

const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const unit=v=>{const n=Math.hypot(...v);return n>1e-12?v.map(x=>x/n):[0,1,0];};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

/** The small wheel describes tangent directions AT one point, not a finite
 * flat patch of constant potential. The path remains on the numerical surface. */
export function normalFrame(E,tangent,chargeSign=1){
 const normal=unit(E).map(v=>v*(chargeSign<0?-1:1));
 let projected=tangent.map((v,i)=>v-dot(tangent,normal)*normal[i]);
 if(Math.hypot(...projected)<1e-10){const axis=Math.abs(normal[0])<.8?[1,0,0]:[0,1,0];projected=cross(normal,axis);}
 const along=unit(projected),across=unit(cross(normal,along));
 return {normal,along,across,directions:Array.from({length:8},(_,i)=>along.map((v,k)=>v*Math.cos(i*Math.PI/4)+across[k]*Math.sin(i*Math.PI/4)))};
}

export function potentialContributions(pos,sources){return sources.map(source=>fieldAt(pos,[source]).V);}

/** A real, finite probe along a fixed non-equatorial ray. Infinity is the
 * limiting reference, never an extra source or a finite point in this model. */
export function farReference(sources,distance){
 const r=Math.max(8,Number(distance)||8),p=[r/Math.SQRT2,r/Math.SQRT2,0],f=fieldAt(p,sources);
 return {distance:r,p,V:f.V,E:Math.hypot(...f.E)};
}
