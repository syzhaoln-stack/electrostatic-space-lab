import {fieldAt,CONSTANTS} from './physics.js';

// Goals are defined in world coordinates. Camera orientation is not an input.
export const FIELD_CHALLENGES=Object.freeze([
 Object.freeze({id:'force-direction',kind:'direction',title:'让金色受力沿绿色方向',direction:Object.freeze([0,1,0]),start:Object.freeze([1.1,1.4,.8]),tolerance:8*Math.PI/180}),
 Object.freeze({id:'force-plane',kind:'plane',title:'让金色受力平行绿色平面',normal:Object.freeze([1,0,0]),start:Object.freeze([1.2,.6,.8]),tolerance:.1}),
]);

const norm=v=>Math.hypot(...v),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export function evaluateFieldChallenge(id,{position,sources,chargeSign=-1}){
 const goal=FIELD_CHALLENGES.find(g=>g.id===id);
 if(!goal)throw new Error('Unknown field challenge: '+id);
 const finite=position?.length===3&&position.every(Number.isFinite);
 const E=finite?fieldAt(position,sources).E:[0,0,0],m=norm(E);
 const F=E.map(v=>v*chargeSign*CONSTANTS.elementaryCharge),fm=norm(F);
 const outside=!finite||norm(position)>4.5||Math.abs(position[1])>3||Math.abs(position[2])>2.5;
 const nearSource=finite&&sources.some(s=>norm(position.map((v,i)=>v-s.pos[i]))<Math.max(.65,(s.radius??.24)*2));
 const valid=finite&&!outside&&!nearSource&&Number.isFinite(m)&&m>5&&fm>0;
 const direction=fm>0?F.map(v=>v/fm):[0,0,0];
 const angle=goal.kind==='direction'?Math.acos(Math.max(-1,Math.min(1,dot(direction,goal.direction)))):null;
 const deviation=goal.kind==='plane'?Math.abs(dot(direction,goal.normal)):null;
 const matched=valid&&(goal.kind==='direction'?angle<goal.tolerance:deviation<goal.tolerance);
 return {matched,valid,E,F,fieldMagnitude:m,angle,deviation,reason:outside?'outside':nearSource?'near-source':m<=5||fm===0?'zero-field':'position'};
}

// Require consecutive rendered time at a valid location. A tab suspended in the
// background cannot accrue the hold interval in one large animation-frame step.
export function advanceFieldChallenge(previous,matched,elapsedMs){
 const heldMs=matched?Math.min(600,(previous?.heldMs??0)+Math.max(0,Math.min(100,elapsedMs))):0;
 const completed=!!previous?.completed||heldMs>=600;
 return {matched,heldMs,progress:heldMs/600,completed,newlyCompleted:completed&&!previous?.completed};
}
