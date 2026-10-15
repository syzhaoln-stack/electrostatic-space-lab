import {THREE} from './scene.js';
import {fieldAt,CONSTANTS} from './physics.js';
import {SINGLE_SOURCE,radialRelease,releaseSample,buildSurfaceSweep,surfaceSweepSample,SURFACE_TRACE_SEGMENTS,surfacePlaybackRate} from './potential-surfaces.js';
const clean=v=>Math.abs(v)<1e-8?0:v;
const fmt=v=>clean(v).toFixed(3);
export function motionMarkup(mode='radial'){
 return `<div class="potential-motion-actions"><button id="potential-play" class="primary">${mode==='radial'?'▶ 释放 +q':'▶ 沿等势面移动'}</button><button id="potential-reset" aria-label="回到起点">↺</button></div><label class="potential-motion-progress" for="potential-progress">回放 <span id="potential-playback-rate"></span><output id="potential-progress-value">0%</output><input id="potential-progress" type="range" min="0" max="100" value="0" step="1"></label>`;
}
export function createPotentialMotion(scene,container){
 const $=s=>container.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let options={},progress=0,playing=false,lastTime=null,release=null,probe,force,eArrow,tangent,patch,normalLabel,forceLabel,probeLabel,tangentLabel,rightAngle,trace,sweep=null,pulseAt=null,pulseKind='selection',completed=false;
 const vector=p=>new THREE.Vector3(...p);
 function label(text,height=.3){return scene.label(text,[0,0,0],'#cce9e6','motion',height);}
 function position(t){return options.mode==='radial'?releaseSample(release,t).pos:surfaceSweepSample(sweep,t).pos;}
 function tangentAt(t){return surfaceSweepSample(sweep,t).tangent;}
 function read(){const p=position(progress),start=position(0),f=fieldAt(p,options.sources||SINGLE_SOURCE),initial=fieldAt(start,options.sources||SINGLE_SOURCE).V,q=options.chargeSign||1,W=clean(q*(initial-f.V)),deltaK=options.mode==='radial'?releaseSample(release,progress).K:0;return {p,E:f.E,V:f.V,U:q*f.V,W,deltaU:-W,deltaK,initial,progress,forceN:CONSTANTS.elementaryCharge*Math.hypot(...f.E)};}
 function drawField(){const directions=new Map();for(const plane of ['xy','xz','yz'])for(let i=0;i<16;i++){const a=i*Math.PI/8,c=Math.cos(a),s=Math.sin(a),d=plane==='xy'?[c,s,0]:plane==='xz'?[c,0,s]:[0,c,s];directions.set(d.map(x=>x.toFixed(4)).join(','),vector(d));}for(const d of directions.values()){scene.line([d.clone().multiplyScalar(.35),d.clone().multiplyScalar(4.6)],'#5796b1','motion-field',.14);for(const r of [1.35,2.8,4.3]){const p=d.clone().multiplyScalar(r),E=fieldAt(p.toArray(),SINGLE_SOURCE).E,m=Math.hypot(...E),arrow=scene.arrow(p.toArray(),E,'#69bdd3',.14+.28*m/(m+350),'motion-field');arrow.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=.5;}});}}}
 function update(){if(!options.enabled)return;const s=read(),p=vector(s.p),n=vector(s.E).normalize(),q=options.chargeSign||1,along=options.mode!=='radial';probe.position.copy(p);force.position.copy(p);force.setDirection(n.clone().multiplyScalar(q));eArrow.position.copy(p);eArrow.setDirection(n);probeLabel.position.copy(p).add(new THREE.Vector3(0,.25,.2));normalLabel.position.copy(p).addScaledVector(n,1.6);forceLabel.position.copy(p).addScaledVector(n,q*.88).add(new THREE.Vector3(0,0,.22));
  if(along){const t=vector(tangentAt(progress)).normalize(),bitangent=n.clone().cross(t).normalize();tangent.position.copy(p);tangent.setDirection(t);patch.position.copy(p);patch.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(t,bitangent,n));tangentLabel.position.copy(p).addScaledVector(t,.95);rightAngle.geometry.setFromPoints([p.clone().addScaledVector(n,.24),p.clone().addScaledVector(n,.24).addScaledVector(t,.24),p.clone().addScaledVector(t,.24)]);container.dataset.potentialNormalDotTangent=String(n.dot(t));}
  if(trace)trace.geometry.setDrawRange(0,Math.max(1,Math.floor(progress*SURFACE_TRACE_SEGMENTS)+1));
  if(along&&progress>=1&&!completed){completed=true;pulseAt=performance.now();pulseKind='completion';}else if(progress<1)completed=false;
  $('#potential-progress').value=String(progress*100);$('#potential-progress-value').textContent=Math.round(progress*100)+'%';
  $('#potential-live-v').textContent=fmt(s.V)+' V';$('#potential-live-work').textContent=fmt(s.W);$('#potential-live-k').textContent=fmt(s.deltaK);$('#potential-live-caption').textContent=along?'外力约束 · E ⟂ 位移':'从静止释放 · W = ΔK';
  $('#potential-live-q').textContent=q>0?'+e':'−e';
  $('#potential-play').textContent=playing?'Ⅱ 暂停':progress>=1?'↺ 重播':progress>0?'▶ 继续':along?'▶ 沿等势面移动':'▶ 释放 +q';
  const rate=along?surfacePlaybackRate(progress):1;$('#potential-playback-rate').textContent=along?(progress>=1?'已成面':`播放 ×${rate.toFixed(1)}`):'';
  container.dataset.potentialPlaybackRate=String(rate);container.dataset.potentialSurfaceComplete=String(along&&progress>=1);
  container.dataset.potentialProgress=progress.toFixed(4);container.dataset.potentialWork=String(s.W);container.dataset.potentialDeltaU=String(s.deltaU);container.dataset.potentialDeltaK=String(s.deltaK);container.dataset.potentialProbe=JSON.stringify(s.p);container.dataset.potentialVoltage=String(s.V);container.dataset.potentialTracePoints=String(trace?.geometry.drawRange.count||0);options.onUpdate?.(s);
 }
 function configure(next){options={...next};progress=0;playing=false;lastTime=null;completed=false;pulseAt=performance.now();pulseKind='selection';for(const layer of ['motion','motion-field','motion-path'])scene.clearLayer(layer);if(options.field)drawField();if(!options.enabled)return;if(options.mode==='radial')release=radialRelease(options.radiusA);else sweep=buildSurfaceSweep({mode:options.mode==='pair'?'pair':'single',level:options.orbit?.level,radius:options.radius,start:options.orbit? [options.orbit.radius*Math.cos(options.orbit.phase),options.orbit.y,options.orbit.radius*Math.sin(options.orbit.phase)]:null});const path=Array.from({length:SURFACE_TRACE_SEGMENTS+1},(_,i)=>position(i/SURFACE_TRACE_SEGMENTS));trace=scene.line(path,'#f1c77d','motion-path',.72);trace.geometry.setDrawRange(0,1);
  probe=new THREE.Mesh(new THREE.SphereGeometry(.115,24,18),new THREE.MeshStandardMaterial({color:'#ffda8b',emissive:'#b57b2c',emissiveIntensity:.65,roughness:.25}));scene.layer('motion').add(probe);probeLabel=label(options.chargeSign<0?'−q':'+q');normalLabel=label('E');forceLabel=label('F');forceLabel.material.color.set('#f4bd73');normalLabel.material.color.set('#86d0ee');
  force=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.85,'#f2b967',.16,.08);eArrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),1.45,'#70bddb',.17,.08);scene.layer('motion').add(eArrow,force);
  if(options.mode!=='radial'){tangent=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.8,'#7ce1c1',.14,.07);scene.layer('motion').add(tangent);patch=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),new THREE.MeshBasicMaterial({color:'#60cbb6',transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));scene.layer('motion').add(patch);tangentLabel=label('位移',.25);rightAngle=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#e1fff1',depthTest:false}));rightAngle.renderOrder=10;scene.layer('motion').add(rightAngle);}
  update();
 }
 function bind(){ $('#potential-play')?.addEventListener('click',()=>{if(progress>=1){progress=0;pulseAt=null;}playing=!playing;lastTime=null;update();});$('#potential-reset')?.addEventListener('click',()=>{progress=0;playing=false;lastTime=null;pulseAt=null;update();});$('#potential-progress')?.addEventListener('input',e=>{progress=Number(e.target.value)/100;playing=false;lastTime=null;if(progress<1)pulseAt=null;update();});}
 function tick(t){if(!options.enabled)return;if(playing){const dt=lastTime===null?0:Math.min(60,t-lastTime);lastTime=t;progress=Math.min(1,progress+dt*(options.mode==='radial'?1:surfacePlaybackRate(progress))/(options.mode==='radial'?6500:28000));if(progress===1)playing=false;update();}
  const along=options.mode!=='radial',elapsed=pulseAt===null?Infinity:Math.max(0,t-pulseAt),duration=pulseKind==='completion'?1900:900;
  let glow=0;if(along&&elapsed<duration){if(reduced)glow=.25;else{const cycles=pulseKind==='completion'?2:1;glow=Math.sin(Math.PI*cycles*elapsed/duration)**2*(pulseKind==='completion'?1:.6);}}
  if(elapsed>=duration)pulseAt=null;
  container.dataset.potentialSurfaceGlow=glow.toFixed(4);options.onSurfaceAppearance?.(progress,glow);
 }
 return {configure,bind,tick,read,refresh:update};
}
