/** Independent, non-interacting electron trajectories. Positions mm, times ns,
 * velocities 10^6 m/s; electric fields V/m and potentials V. No particle is
 * split. The time-dependent guide is a prescribed quasistatic field, not an
 * electromagnetic radiation calculation. Static fields are derived from V,
 * including the guide's longitudinal fringe component. */
import {CONSTANTS as C} from './physics.js';
export const BEAM={count:24,charge:-C.elementaryCharge,mass:C.electronMass,launchX:-6,gateX:6};
export const BEAM_LEVELS=[
 {title:'收集一束电子',subtitle:'让有一点散开的电子，一起穿过接收孔。',target:[6,1.2,0],radius:.60,required:18,emitters:1,boost:0,steerY:0,steerZ:0,spread:1.2,speed:1,moving:false,solution:{steerY:270,steerZ:0}},
 {title:'先加速，再转向',subtitle:'加速段提高动能；后面的导向段负责对准空间中的孔。',target:[6,1.2,-.8],radius:.64,required:18,emitters:2,boost:4,steerY:270,steerZ:0,spread:1.2,speed:1,moving:false,solution:{boost:4,steerY:620,steerZ:-410}},
 {title:'接住移动的目标',subtitle:'孔在上下移动。让导向场按相同周期变化，再调它提前多久。',target:[6,1.2,-.8],radius:.58,required:18,emitters:2,boost:4,steerY:620,steerZ:-410,spread:1.0,speed:1,moving:true,solution:{boost:4,steerY:620,steerZ:-410,modulation:300,phase:70}}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=u=>{u=clamp(u,0,1);return u*u*u*(10+u*(-15+6*u));};
const smoothD=u=>u>0&&u<1?30*u*u*(1-u)*(1-u):0;
export function beamOptions(level=0,overrides={}){return {level,...BEAM_LEVELS[level],modulation:0,phase:0,speedSpread:.07,pitch:0,yaw:0,seed:1805,interval:.7,...overrides};}
export function beamField(position,time,o){
 const [x,y,z]=position,accU=(x+4.8)/2.2,boost=o.boost||0;
 const left=(x+2.2)/.7,right=(3.3-x)/.7,w=smooth(left)*smooth(right);
 const derivative=(smoothD(left)*smooth(right)-smooth(left)*smoothD(right))/.0007;
 const oscillation=o.moving?(o.modulation||0)*Math.sin(2*Math.PI*time/22+(o.phase||0)*Math.PI/180):0;
 // Positive control means positive electron deflection, hence negative E.
 const ey=-(o.steerY+oscillation),ez=-o.steerZ;
 const V=boost*smooth(accU)-(ey*y+ez*z)*.001*w;
 const E=[-boost*smoothD(accU)/.0022+(ey*y+ez*z)*.001*derivative,ey*w,ez*w];
 return {E,V,guide:w,accelerator:smoothD(accU)>0};
}
export function gateAt(time,o){return [6,o.target[1]+(o.moving?.75*Math.sin(2*Math.PI*time/22):0),o.target[2]];}
export function kineticEnergy(velocity){return .5*C.electronMass*Math.hypot(...velocity)**2*1e12/C.elementaryCharge;}
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function makeBeam(o){const random=rng(o.seed),particles=[];for(let i=0;i<BEAM.count;i++){
 const emitter=i%o.emitters,offset=o.emitters===1?0:(emitter-.5)*.30;
 const pitch=(o.pitch+(random()*2-1)*o.spread)*Math.PI/180,yaw=(o.yaw+(random()*2-1)*o.spread)*Math.PI/180,speed=o.speed*(1+(random()*2-1)*o.speedSpread);
 particles.push({id:i,emitter,launchTime:i*o.interval,start:[-6,offset+(random()*2-1)*.035,(random()*2-1)*.035],velocity:[speed*Math.cos(pitch)*Math.cos(yaw),speed*Math.sin(pitch),speed*Math.cos(pitch)*Math.sin(yaw)]});
 }return particles;}
function derivative(state,time,o){const E=beamField(state.slice(0,3),time,o).E;return [...state.slice(3),...E.map(v=>v*(-C.elementaryCharge/C.electronMass)*1e-15)];}
function step(state,time,dt,o){const add=(k,s)=>state.map((v,i)=>v+k[i]*s),k1=derivative(state,time,o),k2=derivative(add(k1,dt/2),time+dt/2,o),k3=derivative(add(k2,dt/2),time+dt/2,o),k4=derivative(add(k3,dt),time+dt,o);return state.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);}
function sample(state,time,o){const pos=state.slice(0,3),vel=state.slice(3);return {time,pos,vel,K:kineticEnergy(vel),...beamField(pos,time,o)};}
export function simulateElectron(particle,o,{dt=.025,sampleEvery=3}={}){
 let state=[...particle.start,...particle.velocity],time=particle.launchTime,index=0;
 const samples=[sample(state,time,o)],initialK=kineticEnergy(particle.velocity);let afterBoostK=null;
 while(time<particle.launchTime+32&&index<5000){
  const next=step(state,time,dt,o);index++;
  if(state[0]<-2.6&&next[0]>=-2.6){const f=(-2.6-state[0])/(next[0]-state[0]);afterBoostK=kineticEnergy(state.slice(3).map((v,i)=>v+(next[i+3]-v)*f));}
  if(state[0]<6&&next[0]>=6){const f=(6-state[0])/(next[0]-state[0]),finish=state.map((v,i)=>v+(next[i]-v)*f),arrival=time+dt*f,gate=gateAt(arrival,o),error=Math.hypot(finish[1]-gate[1],finish[2]-gate[2]);samples.push(sample(finish,arrival,o));return {...particle,samples,arrival,gate,error,hit:error<=o.radius,outcome:error<=o.radius?'collected':'missed',initialK,afterBoostK};}
  state=next;time+=dt;if(index%sampleEvery===0)samples.push(sample(state,time,o));
  if(Math.abs(state[1])>6||Math.abs(state[2])>6||state[0]<-8){return {...particle,samples,arrival:time,hit:false,outcome:'escaped',initialK,afterBoostK};}
 }
 return {...particle,samples,arrival:time,hit:false,outcome:'timeout',initialK,afterBoostK};
}
export function simulateBeam(o){const trajectories=makeBeam(o).map(p=>simulateElectron(p,o)),hits=trajectories.filter(p=>p.hit).length;return {trajectories,hits,total:BEAM.count,passed:hits>=o.required,duration:Math.max(...trajectories.map(p=>p.arrival)),options:o};}
export function beamSampleAt(trajectory,time){const a=trajectory.samples;if(time<=a[0].time)return a[0];if(time>=a.at(-1).time)return a.at(-1);let lo=0,hi=a.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(a[m].time<=time)lo=m;else hi=m;}const f=(time-a[lo].time)/(a[hi].time-a[lo].time);return {time,pos:a[lo].pos.map((v,i)=>v+(a[hi].pos[i]-v)*f),vel:a[lo].vel.map((v,i)=>v+(a[hi].vel[i]-v)*f),K:a[lo].K+(a[hi].K-a[lo].K)*f,E:a[lo].E.map((v,i)=>v+(a[hi].E[i]-v)*f)};}
