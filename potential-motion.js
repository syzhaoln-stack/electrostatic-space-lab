import {THREE} from './scene.js';
import {fieldAt,CONSTANTS} from './physics.js';

const source=[{pos:[0,0,0],Q:.3,radius:.22}];
const clean=v=>Math.abs(v)<1e-9?0:v;
const fmt=v=>clean(v).toFixed(3);

export function motionMarkup(mode='radial'){
 const along=mode==='surface';
 return `<div class="potential-motion-actions"><button id="potential-play" class="primary">${along?'让 + 电荷沿球面移动':'让 + 电荷从 A 走到 B'}</button><button id="potential-reset" aria-label="回到起点 A">↺</button></div><label class="potential-motion-progress" for="potential-progress">移动进度 <output id="potential-progress-value">0%</output><input id="potential-progress" type="range" min="0" max="100" value="0" step="1"></label><div class="potential-energy-card"><div class="potential-energy-heading"><span>${along?'沿同一等势面移动':'电场做的功，来自电势能的减少'}</span><small>试探电荷 +e</small></div><div class="potential-energy-track"><i id="potential-u-bar"></i><i id="potential-w-bar"></i></div><div class="potential-energy-readings"><div><span>电势能 U</span><strong id="potential-current-u">—</strong><small>eV</small></div><div><span>电场已做的功 W</span><strong id="potential-work">—</strong><small>eV</small></div></div><p id="potential-motion-result"></p></div><p class="potential-motion-caption">按指定路径移动，外力控制速度；不是自由飞行。电场中的流动标记只表示方向，不是真实粒子。</p>`;
}

export function createPotentialMotion(scene,container){
 const $=s=>container.querySelector(s);let options={},progress=0,playing=false,lastTime=null,flow=[],probe=null,force=null,tangent=null,patch=null,rightAngle=null,angleLabel=null,probeLabel=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function label(text,layer='motion',height=.38){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font='500 34px "Microsoft YaHei",sans-serif';canvas.width=Math.ceil(ctx.measureText(text).width+20);canvas.height=56;ctx.font='500 34px "Microsoft YaHei",sans-serif';ctx.fillStyle='#07111de8';ctx.fillRect(0,0,canvas.width,56);ctx.fillStyle='#e3f6ff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,canvas.width/2,28);const tx=new THREE.CanvasTexture(canvas);tx.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthTest:false,depthWrite:false,fog:false,toneMapped:false}));sprite.scale.set(height*canvas.width/56,height,1);scene.layer(layer).add(sprite);return sprite;
 }
 function position(t){return options.mode==='surface'?[options.radius*Math.cos(t*Math.PI/2),options.radius*Math.sin(t*Math.PI/2),0]:[options.radiusA+(4-options.radiusA)*t,0,0];}
 function read(){const p=position(progress),start=position(0),f=fieldAt(p,source),initial=fieldAt(start,source).V;return {p,E:f.E,V:f.V,U:f.V,W:clean(initial-f.V),deltaU:clean(f.V-initial),initial,progress,forceN:CONSTANTS.elementaryCharge*Math.hypot(...f.E)};}
 function drawField(){
  const g=scene.layer('motion-field');flow=[];
  for(let i=0;i<32;i++){
   const y=1-2*(i+.5)/32,theta=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y),d=new THREE.Vector3(r*Math.cos(theta),y,r*Math.sin(theta));
   scene.line([d.clone().multiplyScalar(.35),d.clone().multiplyScalar(4.8)],'#55d6d0','motion-field',.24);
   const arrow=scene.arrow(d.clone().multiplyScalar(2.6).toArray(),d.toArray(),'#67cfce',.22,'motion-field');arrow.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=.56;}});
   for(let k=0;k<2;k++){const m=new THREE.Mesh(new THREE.SphereGeometry(.027,8,6),new THREE.MeshBasicMaterial({color:'#8cece4',transparent:true,opacity:.83}));g.add(m);flow.push({mesh:m,d,phase:(i*.618+k*.5)%1});}
  }
 }
 function update(){
  if(!options.enabled)return;
  const s=read(),p=new THREE.Vector3(...s.p),n=new THREE.Vector3(...s.E).normalize(),along=options.mode==='surface';
  probe.position.copy(p);force.position.copy(p);force.setDirection(n);
  probeLabel.position.copy(p).add(new THREE.Vector3(0,0,.45));
  if(along){
   const t=new THREE.Vector3(-n.y,n.x,0);tangent.position.copy(p);tangent.setDirection(t);
   patch.position.copy(p);patch.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);
   const points=[p.clone().addScaledVector(n,.28),p.clone().addScaledVector(n,.28).addScaledVector(t,.28),p.clone().addScaledVector(t,.28)];rightAngle.geometry.setFromPoints(points);
   angleLabel.position.copy(p).addScaledVector(n,.43).addScaledVector(t,.43);
  }
  $('#potential-progress')&&($('#potential-progress').value=String(Math.round(progress*100)));
  $('#potential-progress-value')&&($('#potential-progress-value').textContent=Math.round(progress*100)+'%');
  $('#potential-current-u')&&($('#potential-current-u').textContent=fmt(s.U));
  $('#potential-work')&&($('#potential-work').textContent=fmt(s.W));
  $('#potential-force-value')&&($('#potential-force-value').textContent=s.forceN.toExponential(3)+' N');
  $('#potential-u-bar')&&($('#potential-u-bar').style.width=`${s.U/s.initial*100}%`);
  $('#potential-w-bar')&&($('#potential-w-bar').style.width=`${Math.max(0,s.W/s.initial*100)}%`);
  $('#potential-motion-result')&&($('#potential-motion-result').textContent=along?'力始终垂直于沿面的移动方向：V 不变，电场做功为 0。':`走到这里：V = ${fmt(s.V)} V；电势能减少 ${fmt(s.W)} eV。`);
  const hud=$('#potential-scene-note');if(hud)hud.innerHTML=along?`<strong>F ⟂ 路径</strong><br>电场做功 W = 0`:`<strong>F = qE</strong><br>V　${fmt(s.V)} V<br>W　${fmt(s.W)} eV`;
  const button=$('#potential-play');if(button)button.textContent=playing?'暂停移动':progress>=1?'再走一次':progress>0?'继续移动':along?'让 + 电荷沿球面移动':'让 + 电荷从 A 走到 B';
  container.dataset.potentialProgress=progress.toFixed(4);container.dataset.potentialWork=String(s.W);container.dataset.potentialDeltaU=String(s.deltaU);
 }
 function configure(next){
  options={...next};progress=0;playing=false;lastTime=null;flow=[];
  for(const layer of ['motion','motion-field','motion-path'])scene.clearLayer(layer);
  if(options.field)drawField();
  if(!options.enabled)return;
  const path=Array.from({length:81},(_,i)=>position(i/80));scene.line(path,'#f4bd62','motion-path',.85);
  probe=new THREE.Mesh(new THREE.SphereGeometry(.105,24,18),new THREE.MeshStandardMaterial({color:'#ffcf75',emissive:'#d58a2a',emissiveIntensity:.55,roughness:.3}));scene.layer('motion').add(probe);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;const glowCtx=glowCanvas.getContext('2d'),gradient=glowCtx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'#ffd37599');gradient.addColorStop(.3,'#ffbb4933');gradient.addColorStop(1,'#ffbb4900');glowCtx.fillStyle=gradient;glowCtx.fillRect(0,0,64,64);const glowTexture=new THREE.CanvasTexture(glowCanvas);glowTexture.colorSpace=THREE.SRGBColorSpace;const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.scale.set(.64,.64,1);probe.add(glow);
  probeLabel=label('+q');force=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),1.12,'#ffad63',.2,.11);scene.layer('motion').add(force);
  if(options.mode==='surface'){
   tangent=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.9,'#6ee9df',.16,.09);scene.layer('motion').add(tangent);
   patch=new THREE.Mesh(new THREE.PlaneGeometry(1.15,1.15),new THREE.MeshBasicMaterial({color:'#3ba9b8',transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));scene.layer('motion').add(patch);
   rightAngle=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#c9fff0'}));scene.layer('motion').add(rightAngle);angleLabel=label('90°','motion',.32);
  }
  update();
 }
 function bind(){
  $('#potential-play')?.addEventListener('click',()=>{if(progress>=1)progress=0;playing=!playing;lastTime=null;update();});
  $('#potential-reset')?.addEventListener('click',()=>{progress=0;playing=false;lastTime=null;update();});
  $('#potential-progress')?.addEventListener('input',e=>{progress=Number(e.target.value)/100;playing=false;lastTime=null;update();});
 }
 function tick(t){
  if(options.field)for(const f of flow){const u=(f.phase+(reduced?0:t/6500))%1;f.mesh.position.copy(f.d).multiplyScalar(.45+4.25*u);}
  if(!playing)return;const dt=lastTime===null?0:Math.min(60,t-lastTime);lastTime=t;progress=Math.min(1,progress+dt/5200);if(progress===1)playing=false;update();
 }
 return {configure,bind,tick,read,refresh:update};
}
