/** Two equal conducting spheres: coordinates mm, voltage kV, E kV/mm.
 * Left sphere has prescribed V; right sphere and infinity are at 0.
 * Repeated Kelvin images enforce the two equipotential boundaries.
 * The charging model uses nA=nC/s, nC=pF*kV, and energy in microjoules.
 */
export const SPARK_DEFAULTS=Object.freeze({radius:20,gap:3,currentNA:5,thresholdKVmm:3});
const K_NC=8.9875517923;

export function solveSpherePair(gap=3,radius=20){
 if(!(gap>=.5&&gap<=20&&radius>0))throw new RangeError('Sphere dimensions outside the supported teaching range');
 const centers=[[-radius-gap/2,0,0],[radius+gap/2,0,0]],images=[{pos:[...centers[0]],w:radius,side:0}];
 for(let i=1;i<512;i++){
  const old=images.at(-1),side=1-old.side,center=centers[side],delta=old.pos.map((v,k)=>v-center[k]),distance=Math.hypot(...delta),w=-radius/distance*old.w;
  if(Math.abs(w)<radius*1e-13)break;
  images.push({pos:center.map((v,k)=>v+radius*radius/distance**2*delta[k]),w,side});
 }
 const capacitancePF=images.filter(s=>s.side===0).reduce((sum,s)=>sum+s.w,0)/K_NC;
 const model={radius,gap,centers,images,capacitancePF,maxGapFieldPerKV:0};
 for(let i=0;i<=600;i++)model.maxGapFieldPerKV=Math.max(model.maxGapFieldPerKV,Math.abs(sphereField(model,[-gap/2+gap*i/600,0,0],1).E[0]));
 return model;
}

export function sphereField(model,point,voltageKV=1){
 let V=0;const E=[0,0,0];
 for(const image of model.images){const delta=point.map((v,i)=>v-image.pos[i]),r=Math.hypot(...delta);if(r<1e-12)continue;V+=image.w/r;for(let i=0;i<3;i++)E[i]+=image.w*delta[i]/r**3;}
 return {V:V*voltageKV,E:E.map(v=>v*voltageKV)};
}

export function sphereReadings(model,voltageKV){
 return {voltageKV,chargeNC:model.capacitancePF*voltageKV,energyUJ:.5*model.capacitancePF*voltageKV**2,fieldKVmm:model.maxGapFieldPerKV*voltageKV,capacitancePF:model.capacitancePF};
}

export function initialSparkState(){return {phase:'ready',voltageKV:0,chargingSeconds:0,dischargeAge:0,peakVoltageKV:0,peakEnergyUJ:0};}

export function advanceSpark(model,state,dt,{currentNA=5,thresholdKVmm=3}={}){
 if(!(dt>=0&&Number.isFinite(dt)))throw new RangeError('Invalid time step');
 const next={...state};let remaining=dt;
 if(next.phase==='charging'){
  const limit=thresholdKVmm/model.maxGapFieldPerKV,rate=currentNA/model.capacitancePF,timeToLimit=Math.max(0,(limit-next.voltageKV)/rate),chargeTime=Math.min(remaining,timeToLimit);
  next.voltageKV+=rate*chargeTime;next.chargingSeconds+=chargeTime;remaining-=chargeTime;
  if(timeToLimit<=dt){next.voltageKV=limit;next.phase='discharging';next.peakVoltageKV=limit;next.peakEnergyUJ=sphereReadings(model,limit).energyUJ;next.dischargeAge=0;}
 }
 if(next.phase==='discharging'){
  // Pedagogical slow motion only: this exponential is NOT a predicted arc waveform.
  next.dischargeAge+=remaining;next.voltageKV=next.peakVoltageKV*Math.exp(-next.dischargeAge/.55);
  if(next.dischargeAge>=2.75){next.voltageKV=0;next.phase='complete';}
 }
 return next;
}

export function traceSphereField(model,normal,{stepMM=.65,maxSteps=220}={}){
 const r=model.radius,origin=model.centers[0],start=origin.map((v,i)=>v+normal[i]*(r+.06)),path=[start];let point=start;
 for(let i=0;i<maxSteps;i++){
  const e=sphereField(model,point).E,m=Math.hypot(...e);if(m<1e-12)break;
  const mid=point.map((v,j)=>v+e[j]/m*stepMM/2),em=sphereField(model,mid).E,mm=Math.hypot(...em);if(mm<1e-12)break;
  const next=point.map((v,j)=>v+em[j]/mm*stepMM);
  if(Math.hypot(...next.map((v,j)=>v-model.centers[1][j]))<r+.06){path.push(next);break;}
  path.push(next);point=next;if(Math.hypot(...point)>85)break;
 }
 return path;
}
