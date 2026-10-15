/** Independent, non-interacting test-particle trajectories. Positions mm, times ns,
 * velocities 10^6 m/s; electric fields V/m and potentials V. No particle is
 * split. The time-dependent guide is a prescribed quasistatic field, not an
 * electromagnetic radiation calculation. Static fields are derived from V,
 * with a spatially uniform transverse guide (ideal infinite plates). */
import {CONSTANTS as C} from './physics.js';
export const BEAM={count:100,charge:-C.elementaryCharge,mass:C.electronMass,launchX:-6,gateX:6};
export const BEAM_GROUPS=[{group:'A',chargeUnits:1,massUnits:1},{group:'B',chargeUnits:2,massUnits:1},{group:'C',chargeUnits:1,massUnits:2},{group:'D',chargeUnits:2,massUnits:2}].map(g=>({...g,charge:-g.chargeUnits*C.elementaryCharge,mass:g.massUnits*C.electronMass}));
export const BEAM_LEVELS=[
 {title:'收集一束电子',subtitle:'让有一点散开的电子，一起穿过接收孔。',target:[6,1.2,0],radius:.60,required:75,emitters:1,boost:0,steerY:45,steerZ:0,spread:.5,speed:1,moving:false,solution:{steerY:95,steerZ:0}},
 {title:'加速与转向',subtitle:'提高纵向动能，同时调整横向场，让束流对准孔。',target:[6,1.2,-.8],radius:.64,required:75,emitters:2,boost:4,steerY:95,steerZ:0,spread:.5,speed:1,moving:false,solution:{boost:4,steerY:200,steerZ:-130}},
 {title:'接住移动的目标',subtitle:'孔在上下移动。让导向场按相同周期变化，再调它提前多久。',target:[6,1.2,-.8],radius:.58,required:75,emitters:2,boost:4,steerY:200,steerZ:-130,spread:.5,speed:1,moving:true,solution:{boost:4,steerY:200,steerZ:-130,modulation:160,phase:90}}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=u=>{u=clamp(u,0,1);return u*u*u*(10+u*(-15+6*u));};
const smoothD=u=>u>0&&u<1?30*u*u*(1-u)*(1-u):0;
export function beamOptions(level=0,overrides={}){const o={level,...BEAM_LEVELS[level],modulation:0,phase:0,mode:'electron',profile:'normal',speedSpread:.07,pitch:0,yaw:0,seed:1805,interval:.14,...overrides};o.spread=clamp(o.spread,0,1);o.pitch=clamp(o.pitch,-1,1);o.yaw=clamp(o.yaw,-1,1);return o;}
export function beamField(position,time,o){
 const [x,y,z]=position,accU=(x+4.8)/2.2,boost=o.boost||0;

 const oscillation=o.moving?(o.modulation||0)*Math.sin(2*Math.PI*time/22+(o.phase||0)*Math.PI/180):0;
 // Positive control means positive electron deflection, hence negative E.
 const ey=-(o.steerY+oscillation),ez=-o.steerZ;
 const V=boost*smooth(accU)-(ey*y+ez*z)*.001;
 const E=[-boost*smoothD(accU)/.0022,ey,ez];
 return {E,V,guide:1,accelerator:smoothD(accU)>0};
}
export function gateAt(time,o){return [6,o.target[1]+(o.moving?.75*Math.sin(2*Math.PI*time/22):0),o.target[2]];}
export function kineticEnergy(velocity,mass=C.electronMass){return .5*mass*Math.hypot(...velocity)**2*1e12/C.elementaryCharge;}
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function makeBeam(o){const random=rng(o.seed),particles=[],compare=o.mode==='comparison',ranks=compare?25:BEAM.count;for(let rank=0;rank<ranks;rank++){
 const emitter=rank%o.emitters,offset=o.emitters===1?0:(emitter-.5)*.30;
 const radius=Math.sqrt(random())*o.spread,azimuth=2*Math.PI*random();let py=o.pitch+radius*Math.cos(azimuth),pz=o.yaw+radius*Math.sin(azimuth);const angularNorm=Math.hypot(py,pz);if(angularNorm>1){py/=angularNorm;pz/=angularNorm;}const angle=Math.hypot(py,pz)*Math.PI/180,unitLength=Math.hypot(py,pz)||1,speed=o.speed*((o.profile==='mixed'?(rank%2===0?.85:1.15):1)+(random()*2-1)*o.speedSpread);
 const start=[-6,offset+(random()*2-1)*.035,(random()*2-1)*.035],velocity=[speed*Math.cos(angle),speed*Math.sin(angle)*py/unitLength,speed*Math.sin(angle)*pz/unitLength],launchTime=rank*o.interval*(compare?4:1);
 const groups=compare?BEAM_GROUPS:[{group:'e',charge:BEAM.charge,mass:BEAM.mass,chargeUnits:1,massUnits:1}];groups.forEach((g,index)=>particles.push({...g,id:compare?rank*4+index:rank,rank,emitter,launchTime,start:[...start],velocity:[...velocity]}));
 }return particles;}

function derivative(state,time,o,qOverM){const E=beamField(state.slice(0,3),time,o).E;return [...state.slice(3),...E.map(v=>v*qOverM*1e-15)];}
function step(state,time,dt,o,qOverM){const add=(k,s)=>state.map((v,i)=>v+k[i]*s),k1=derivative(state,time,o,qOverM),k2=derivative(add(k1,dt/2),time+dt/2,o,qOverM),k3=derivative(add(k2,dt/2),time+dt/2,o,qOverM),k4=derivative(add(k3,dt),time+dt,o,qOverM);return state.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);}
function sample(state,time,o,charge,mass){const pos=state.slice(0,3),vel=state.slice(3),field=beamField(pos,time,o);return {time,pos,vel,charge,mass,K:kineticEnergy(vel,mass),...field,F:field.E.map(e=>charge*e)};}
export function simulateElectron(particle,o,{dt=.025,sampleEvery=3}={}){
 const charge=particle.charge??BEAM.charge,mass=particle.mass??BEAM.mass;if(!Number.isFinite(mass)||mass<=0||!Number.isFinite(charge))throw new RangeError('A finite charge and positive finite mass are required');particle={...particle,charge,mass};const qOverM=charge/mass;
 let state=[...particle.start,...particle.velocity],time=particle.launchTime,index=0;
 const samples=[sample(state,time,o,charge,mass)],initialK=kineticEnergy(particle.velocity,mass);let afterBoostK=null;
 while(time<particle.launchTime+32&&index<5000){
  const next=step(state,time,dt,o,qOverM);index++;
  if(state[0]<-2.6&&next[0]>=-2.6){const f=(-2.6-state[0])/(next[0]-state[0]);afterBoostK=kineticEnergy(state.slice(3).map((v,i)=>v+(next[i+3]-v)*f),mass);}
  if(state[0]<6&&next[0]>=6){const f=(6-state[0])/(next[0]-state[0]),finish=state.map((v,i)=>v+(next[i]-v)*f),arrival=time+dt*f,gate=gateAt(arrival,o),error=Math.hypot(finish[1]-gate[1],finish[2]-gate[2]);samples.push(sample(finish,arrival,o,charge,mass));return {...particle,samples,arrival,gate,error,hit:error<=o.radius,outcome:error<=o.radius?'collected':'missed',initialK,afterBoostK};}
  state=next;time+=dt;if(index%sampleEvery===0)samples.push(sample(state,time,o,charge,mass));
  if(Math.abs(state[1])>6||Math.abs(state[2])>6||state[0]<-8){return {...particle,samples,arrival:time,hit:false,outcome:'escaped',initialK,afterBoostK};}
 }
 return {...particle,samples,arrival:time,hit:false,outcome:'timeout',initialK,afterBoostK};
}
export function simulateBeam(o){const trajectories=makeBeam(o).map(p=>simulateElectron(p,o)),hits=trajectories.filter(p=>p.hit).length;return {trajectories,hits,total:BEAM.count,passed:o.mode!=='comparison'&&hits>=o.required,duration:Math.max(...trajectories.map(p=>p.arrival)),options:o};}
export function beamSampleAt(trajectory,time){const a=trajectory.samples;if(time<=a[0].time)return a[0];if(time>=a.at(-1).time)return a.at(-1);let lo=0,hi=a.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(a[m].time<=time)lo=m;else hi=m;}const f=(time-a[lo].time)/(a[hi].time-a[lo].time);return {time,charge:trajectory.charge??BEAM.charge,mass:trajectory.mass??BEAM.mass,pos:a[lo].pos.map((v,i)=>v+(a[hi].pos[i]-v)*f),vel:a[lo].vel.map((v,i)=>v+(a[hi].vel[i]-v)*f),K:a[lo].K+(a[hi].K-a[lo].K)*f,E:a[lo].E.map((v,i)=>v+(a[hi].E[i]-v)*f)};}
