import {THREE} from './scene.js';
import {fieldAt,CONSTANTS} from './physics.js';

const source=[{pos:[0,0,0],Q:.3,radius:.22}];
const clean=v=>Math.abs(v)<1e-9?0:v;
const fmt=v=>clean(v).toFixed(3);

export function motionMarkup(mode='radial'){
 const along=mode==='surface';
 return `<div class="potential-motion-actions"><button id="potential-play" class="primary">${along?'让 + 电荷沿球面移动':'让 + 电荷从 A 走到 B'}</button><button id="potential-reset" aria-label="回到起点 A">↺</button></div><label class="potential-motion-progress" for="potential-progress">移动进度 <output id="potential-progress-value">0%</output><input id="potential-progress" type="range" min="0" max="100" value="0" step="1"></label><div class="potential-energy-card"><div class="potential-energy-heading"><span>${along?'沿同一等势面移动':'电场做的功，来自电势能的减少'}</span><small>试探电荷 +e</small></div><div class="potential-energy-track"><i id="potential-u-bar"></i><i id="potential-w-bar"></i></div><div class="potential-energy-readings"><div><span>电势能 U</span><strong id="potential-current-u">—</strong><small>eV</small></div><div><span>电场已做的功 W</span><strong id="potential-work">—</strong><small>eV</small></div></div><p id="potential-motion-result"></p></div><p class="potential-motion-caption">按指定路径移动，外力控制速度；不是自由飞行。箭头表示方向，长度经过压缩。</p>`;
}

export function createPotentialMotion(scene,container){
 const $=s=>container.querySelector(s);let options={},progress=0,playing=false,lastTime=null,probe=null,force=null,tangent=null,patch=null,rightAngle=null,angleLabel=null,probeLabel=null,normalLabel=null,tangentLabel=null;
 function label(text,layer='motion',height=.38){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font='500 34px "Microsoft YaHei",sans-serif';canvas.width=Math.ceil(ctx.measureText(text).width+20);canvas.height=56;ctx.font='500 34px "Microsoft YaHei",sans-serif';ctx.fillStyle='#07111de8';ctx.fillRect(0,0,canvas.width,56);ctx.fillStyle='#e3f6ff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,canvas.width/2,28);const tx=new THREE.CanvasTexture(canvas);tx.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthTest:false,depthWrite:false,fog:false,toneMapped:false}));sprite.scale.set(height*canvas.width/56,height,1);scene.layer(layer).add(sprite);return sprite;
 }
 function position(t){return options.mode==='surface'?[options.radius*Math.cos(t*Math.PI/2),options.radius*Math.sin(t*Math.PI/2),0]:[options.radiusA+(4-options.radiusA)*t,0,0];}
 function read(){const p=position(progress),start=position(0),f=fieldAt(p,source),initial=fieldAt(start,source).V;return {p,E:f.E,V:f.V,U:f.V,W:clean(initial-f.V),deltaU:clean(f.V-initial),initial,progress,forceN:CONSTANTS.elementaryCharge*Math.hypot(...f.E)};}
 function drawField(){
  // Regular meridians keep the radial symmetry legible. The arrows are samples,
  // not moving particles, and their length is compressed using a fixed scale.
  const directions=new Map();
  for(const plane of ['xy','xz','yz'])for(let i=0;i<20;i++){
   const a=i*Math.PI/10,c=Math.cos(a),s=Math.sin(a),d=plane==='xy'?[c,s,0]:plane==='xz'?[c,0,s]:[0,c,s];
   directions.set(d.map(x=>Math.abs(x)<1e-6?'0':x.toFixed(5)).join(','),new THREE.Vector3(...d));
  }
  for(const d of directions.values()){
   scene.line([d.clone().multiplyScalar(.35),d.clone().multiplyScalar(4.6)],'#5796b1','motion-field',.19);
   for(const r of [1.35,2.8,4.3]){
    const p=d.clone().multiplyScalar(r),E=fieldAt(p.toArray(),source).E,m=Math.hypot(...E),length=.14+.28*m/(m+350);
    const arrow=scene.arrow(p.toArray(),E,'#69bdd3',length,'motion-field');
    arrow.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=.42+.25*m/(m+350);}});
   }
  }
 }
 function update(){
  if(!options.enabled)return;
  const s=read(),p=new THREE.Vector3(...s.p),n=new THREE.Vector3(...s.E).normalize(),along=options.mode==='surface';
  probe.position.copy(p);force.position.copy(p);force.setDirection(n);
  probeLabel.position.copy(p).add(new THREE.Vector3(0,0,.35));
  normalLabel.position.copy(p).addScaledVector(n,1.32);
  if(along){
   const t=new THREE.Vector3(-n.y,n.x,0);tangent.position.copy(p);tangent.setDirection(t);
   patch.position.copy(p);patch.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(t,new THREE.Vector3(0,0,1),n));
   tangentLabel.position.copy(p).addScaledVector(t,1.17).add(new THREE.Vector3(0,0,.08));
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
  if(along){const displacement=new THREE.Vector3(-n.y,n.x,0);container.dataset.potentialNormalDotTangent=String(n.dot(displacement));container.dataset.potentialTangentNormal=JSON.stringify(n.toArray());}
  container.dataset.potentialProgress=progress.toFixed(4);container.dataset.potentialWork=String(s.W);container.dataset.potentialDeltaU=String(s.deltaU);
 }
 function configure(next){
  options={...next};progress=0;playing=false;lastTime=null;
  for(const layer of ['motion','motion-field','motion-path'])scene.clearLayer(layer);
  if(options.field)drawField();
  if(!options.enabled)return;
  const path=Array.from({length:81},(_,i)=>position(i/80));scene.line(path,'#f4bd62','motion-path',.85);
  probe=new THREE.Mesh(new THREE.SphereGeometry(.105,24,18),new THREE.MeshStandardMaterial({color:'#ffcf75',emissive:'#d58a2a',emissiveIntensity:.55,roughness:.3}));scene.layer('motion').add(probe);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;const glowCtx=glowCanvas.getContext('2d'),gradient=glowCtx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'#ffd37599');gradient.addColorStop(.3,'#ffbb4933');gradient.addColorStop(1,'#ffbb4900');glowCtx.fillStyle=gradient;glowCtx.fillRect(0,0,64,64);const glowTexture=new THREE.CanvasTexture(glowCanvas);glowTexture.colorSpace=THREE.SRGBColorSpace;const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.scale.set(.64,.64,1);probe.add(glow);
  probeLabel=label('+q','motion',.30);normalLabel=label(options.mode==='surface'?'E、F':'F','motion',.31);force=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),1.12,'#ffad63',.2,.11);scene.layer('motion').add(force);
  if(options.mode==='surface'){
   tangent=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.9,'#6ee9df',.16,.09);scene.layer('motion').add(tangent);
   patch=new THREE.Group();const half=.85;const face=new THREE.Mesh(new THREE.PlaneGeometry(half*2,half*2),new THREE.MeshBasicMaterial({color:'#57b9b5',transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));patch.add(face);
   const edgePoints=[[-half,-half,0],[half,-half,0],[half,half,0],[-half,half,0],[-half,-half,0]].map(p=>new THREE.Vector3(...p));patch.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgePoints),new THREE.LineBasicMaterial({color:'#70d9d0',transparent:true,opacity:.85})));
   const grid=[];for(const v of [-.42,0,.42])grid.push(-half,v,0,half,v,0,v,-half,0,v,half,0);const gridGeometry=new THREE.BufferGeometry();gridGeometry.setAttribute('position',new THREE.Float32BufferAttribute(grid,3));patch.add(new THREE.LineSegments(gridGeometry,new THREE.LineBasicMaterial({color:'#6fc6c5',transparent:true,opacity:.26})));scene.layer('motion').add(patch);tangentLabel=label('沿面位移','motion',.29);
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
  if(!playing)return;const dt=lastTime===null?0:Math.min(60,t-lastTime);lastTime=t;progress=Math.min(1,progress+dt/5200);if(progress===1)playing=false;update();
 }
 return {configure,bind,tick,read,refresh:update};
}
