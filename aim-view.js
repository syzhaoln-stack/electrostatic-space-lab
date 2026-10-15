import {THREE} from './scene.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {aimOptions,aimVelocity,aimState} from './aim-physics.js';

const GOLD='#f3c985', MINT='#89e3cd', CYAN='#58a5bb', BG='#050d14';
const vector=p=>new THREE.Vector3(...p);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

// The three views use the same analytic state. The two small views are exact
// orthographic projections, not independently integrated simulations.
export function mountAimView(mainHost,xyHost,xzHost,{onAimChange=()=>{},onFieldChange=()=>{}}={}){
 let options=aimOptions(),result=null,history=null,time=0,ghosts=true,disposed=false,trailCount=0;
 let bounds=new THREE.Box3(vector([-11,-5,-4]),vector([10,5,4]));
 const scene=new THREE.Scene();scene.background=new THREE.Color(BG);
 const camera=new THREE.PerspectiveCamera(36,1,.1,400);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.className='aim-space-canvas';mainHost.classList.add('aim-view-host');mainHost.append(renderer.domElement);
 const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.08;orbit.enablePan=false;orbit.minDistance=8;orbit.maxDistance=120;
 scene.add(new THREE.HemisphereLight('#d5f2ee','#07101e',2));
 const light=new THREE.DirectionalLight('#fff0d7',3);light.position.set(-5,10,9);scene.add(light);
 const group=new THREE.Group();scene.add(group);
 const basic=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1,toneMapped:false});
 function addLine(points,color,opacity=1,dashed=false,parent=group){
  const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>Array.isArray(p)?vector(p):p));
  const material=dashed?new THREE.LineDashedMaterial({color,transparent:true,opacity,dashSize:.17,gapSize:.13}):new THREE.LineBasicMaterial({color,transparent:true,opacity});
  const line=new THREE.Line(geometry,material);if(dashed)line.computeLineDistances();parent.add(line);return line;
 }
 function setLine(line,points){const positions=line.geometry.getAttribute('position');if(positions?.count===points.length){points.forEach((p,i)=>{const v=Array.isArray(p)?vector(p):p;positions.setXYZ(i,v.x,v.y,v.z);});positions.needsUpdate=true;line.geometry.computeBoundingSphere();}else{line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>Array.isArray(p)?vector(p):p));}if(line.material.isLineDashedMaterial)line.computeLineDistances();}
 function arrow(color){const a=new THREE.ArrowHelper(vector([0,1,0]),new THREE.Vector3(),1,color,.19,.11);a.line.material.transparent=true;a.line.material.opacity=.85;group.add(a);return a;}
 function placeArrow(a,from,to){const delta=vector(to).sub(vector(from)),length=delta.length();a.visible=length>.045;if(!a.visible)return;a.position.set(...from);a.setDirection(delta.normalize());a.setLength(length,Math.min(.22,length*.28),Math.min(.12,length*.17));}
 function ring(radius,color,opacity=1){const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,.025,8,64),basic(color,opacity));group.add(mesh);return mesh;}
 const projectile=new THREE.Mesh(new THREE.SphereGeometry(.13,24,16),new THREE.MeshStandardMaterial({color:GOLD,emissive:GOLD,emissiveIntensity:.22,roughness:.25,metalness:.25}));group.add(projectile);
 const target=new THREE.Group();group.add(target);
 let targetRing=null,targetCross=null;
 const initialTarget=ring(.35,MINT,.22),freeTarget=ring(.13,MINT,.35),freeProjectile=ring(.1,GOLD,.35);
 const targetToFree=addLine([[0,0,0],[0,1,0]],MINT,.28,true),projectileToFree=addLine([[0,0,0],[0,1,0]],GOLD,.28,true);
 const projectileDeflection=arrow(GOLD),targetDeflection=arrow(MINT),electricArrow=arrow('#7dc9dc'),forceArrow=arrow(GOLD);
 const sightLine=addLine([options.start,options.target],'#a5bebd',.38,true);
 const aimLine=addLine([options.start,options.target],GOLD,.7);
 const gun=new THREE.Group();group.add(gun);
 const gunTube=new THREE.Mesh(new THREE.CylinderGeometry(.20,.27,.72,24),new THREE.MeshStandardMaterial({color:'#485c66',metalness:.8,roughness:.3}));gunTube.rotation.x=Math.PI/2;gun.add(gunTube);
 const gunMouth=new THREE.Mesh(new THREE.TorusGeometry(.20,.026,8,48),basic(GOLD,.8));gunMouth.position.z=.37;gun.add(gunMouth);
 const trails={projectile:null,target:null};
 const fieldGroup=new THREE.Group(),groundGroup=new THREE.Group(),historyGroup=new THREE.Group();scene.add(fieldGroup,groundGroup,historyGroup);
 const handleTrack=addLine([[-10,1,2],[-10,4,2]],'#4d7c8d',.55);

 const overlay=document.createElement('div');overlay.className='aim-view-overlay';mainHost.append(overlay);
 function tag(text,className){const element=document.createElement('span');element.className='aim-world-tag '+className;element.textContent=text;overlay.append(element);return element;}
 const labels={projectile:tag('带电粒子','aim-tag-gold'),target:tag('带电靶','aim-tag-mint'),electric:tag('E','aim-tag-cyan'),force:tag('F','aim-tag-gold'),pShift:tag('','aim-tag-gold aim-shift-tag'),tShift:tag('','aim-tag-mint aim-shift-tag')};
 function button(text,label){const element=document.createElement('button');element.type='button';element.className='aim-world-handle';element.textContent=text;element.setAttribute('role','slider');element.setAttribute('aria-label',label);overlay.append(element);return element;}
 const fieldButton=button('E ↕','拖动调节电场强度，方向键也可调节');fieldButton.setAttribute('aria-valuemin','0');fieldButton.setAttribute('aria-valuemax','240');
 const fieldCaption=tag('180 V/m','aim-field-caption');
 const aimButton=button('↕','拖动改变发射方向');aimButton.classList.add('aim-angle-handle');aimButton.setAttribute('aria-valuemin','-12');aimButton.setAttribute('aria-valuemax','12');
 const aimCaption=tag('瞄准方向','aim-aim-caption');
 let fieldBase=vector([-10,1,2]),aimPosition=new THREE.Vector3();
 function screen(p){const v=p.clone().project(camera);return {x:(v.x+1)*mainHost.clientWidth/2,y:(1-v.y)*mainHost.clientHeight/2,visible:v.z<1&&v.z>-1&&Math.abs(v.x)<1.08&&Math.abs(v.y)<1.08};}
 function put(element,p,dx=0,dy=0){const s=screen(p);element.style.left=(s.x+dx)+'px';element.style.top=(s.y+dy)+'px';element.hidden=!s.visible;}
 function valueDrag(button,kind){let dragging=null;
  const value=()=>kind==='field'?options.E[1]:options.pitchOffset;
  const emit=v=>kind==='field'?onFieldChange(clamp(Math.round(v/5)*5,0,240)):onAimChange(clamp(Math.round(v*10)/10,-12,12));
  button.addEventListener('pointerdown',event=>{
   event.preventDefault();event.stopPropagation();let a,b,scale;
   if(kind==='field'){a=screen(fieldBase);b=screen(fieldBase.clone().add(vector([0,3,0])));scale=240;}
   else {const start=vector(options.start),v=vector(aimVelocity({...options,pitchOffset:options.pitchOffset+1})).normalize().multiplyScalar(4.1).add(start);a=screen(aimPosition);b=screen(v);scale=1;}
   const d=new THREE.Vector2(b.x-a.x,b.y-a.y),length=Math.max(kind==='field'?50:1.2,d.length());d.normalize();dragging={x:event.clientX,y:event.clientY,value:value(),d,length,scale};orbit.enabled=false;button.setPointerCapture(event.pointerId);button.classList.add('dragging');
  });
  button.addEventListener('pointermove',event=>{if(!dragging)return;event.preventDefault();emit(dragging.value+((event.clientX-dragging.x)*dragging.d.x+(event.clientY-dragging.y)*dragging.d.y)/dragging.length*dragging.scale);});
  const release=()=>{dragging=null;orbit.enabled=true;button.classList.remove('dragging');};
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();const step=kind==='field'?(event.shiftKey?20:5):(event.shiftKey?1:.2);emit(event.key==='Home'?0:value()+(event.key==='ArrowLeft'||event.key==='ArrowDown'?-step:step));});
 }
 valueDrag(fieldButton,'field');valueDrag(aimButton,'aim');

 const projections=[{host:xyHost,axis:1,label:'XY'},{host:xzHost,axis:2,label:'XZ'}].map(p=>{
  p.canvas=document.createElement('canvas');p.canvas.className='aim-projection-canvas';p.canvas.setAttribute('aria-label',p.label+' 同步投影');p.host.append(p.canvas);p.ctx=p.canvas.getContext('2d');return p;
 });
 function clearGroup(g){for(const child of [...g.children]){child.traverse(item=>{item.geometry?.dispose();if(item.material){for(const material of Array.isArray(item.material)?item.material:[item.material])material.dispose();}});g.remove(child);}}
 function buildTarget(){clearGroup(target);const radius=options.radius||.35;targetRing=new THREE.Mesh(new THREE.TorusGeometry(radius,.035,10,72),basic(MINT));target.add(targetRing);const halo=new THREE.Mesh(new THREE.TorusGeometry(radius+.11,.008,6,64),basic(MINT,.28));target.add(halo);targetCross=addLine([[-radius*.28,0,0],[radius*.28,0,0]],MINT,.75,false,target);addLine([[0,-radius*.28,0],[0,radius*.28,0]],MINT,.75,false,target);target.add(new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),basic('#c0ffe5')));initialTarget.geometry.dispose();initialTarget.geometry=new THREE.TorusGeometry(radius,.018,6,64);}
 function buildField(){
  clearGroup(fieldGroup);clearGroup(groundGroup);
  const min=bounds.min,max=bounds.max,extent=max.clone().sub(min),strength=Math.hypot(...options.E),dir=vector(options.E).normalize(),arrowLength=.7*Math.tanh(strength/140);
  const xCount=7,yCount=3,zs=[min.z*.6,max.z*.6];
  if(strength>0)for(let ix=0;ix<xCount;ix++)for(let iy=0;iy<yCount;iy++)for(const z of zs){
   const p=new THREE.Vector3(min.x+1+(extent.x-2)*ix/(xCount-1),min.y+.8+(extent.y-1.6)*iy/(yCount-1),z);
   const a=new THREE.ArrowHelper(dir,p,arrowLength,CYAN,.12,.065);a.line.material.transparent=true;a.line.material.opacity=.20;a.cone.material.transparent=true;a.cone.material.opacity=.33;fieldGroup.add(a);
  }
  const y=min.y-.55;
  for(let x=Math.ceil(min.x/2)*2;x<=max.x;x+=2)addLine([[x,y,min.z],[x,y,max.z]],'#37647a',.10,false,groundGroup);
  for(let z=Math.ceil(min.z/2)*2;z<=max.z;z+=2)addLine([[min.x,y,z],[max.x,y,z]],'#37647a',.10,false,groundGroup);
  addLine([[min.x,y,min.z],[max.x,y,min.z]],'#567e8d',.24,false,groundGroup);
 }
 function fitCamera(preserveDirection=true){
  const center=bounds.getCenter(new THREE.Vector3()),direction=preserveDirection&&camera.position.length()>1?camera.position.clone().sub(orbit.target).normalize():vector([.28,.30,1]).normalize();
  const right=new THREE.Vector3().crossVectors(vector([0,1,0]),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
  const aspect=Math.max(1,mainHost.clientWidth)/Math.max(1,mainHost.clientHeight),tanV=Math.tan(camera.fov*Math.PI/360),tanH=tanV*aspect;
  let distance=8;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const rel=vector([x,y,z]).sub(center);distance=Math.max(distance,Math.abs(rel.dot(right))/tanH+rel.dot(direction),Math.abs(rel.dot(up))/tanV+rel.dot(direction));}
  distance*=1.14;camera.aspect=aspect;camera.position.copy(center).addScaledVector(direction,distance);camera.lookAt(center);orbit.target.copy(center);camera.updateProjectionMatrix();orbit.update();
 }
 function fitResult(){
  const box=new THREE.Box3();box.expandByPoint(vector(options.start));box.expandByPoint(vector(options.target));
  for(const sample of result?.samples||[])for(const who of ['projectile','target']){box.expandByPoint(vector(sample[who].pos));box.expandByPoint(vector(sample[who].freePos));}
  for(const sample of history?.samples||[])for(const who of ['projectile','target'])box.expandByPoint(vector(sample[who].pos));
  box.min.add(vector([-1.8,-1.6,-2.2]));box.max.add(vector([1.8,2.5,2.2]));
  if(box.max.y-box.min.y<7){const cy=(box.max.y+box.min.y)/2;box.min.y=cy-3.5;box.max.y=cy+3.5;}
  bounds=box;fieldBase.set(options.start[0]-.65,Math.max(options.start[1]+1,bounds.max.y-4),bounds.max.z-.7);setLine(handleTrack,[fieldBase,fieldBase.clone().add(vector([0,3,0]))]);
  buildField();fitCamera(camera.position.length()>1);mainHost.dataset.bounds=JSON.stringify([bounds.min.toArray(),bounds.max.toArray()]);
 }
 function makeTrails(){for(const who of ['projectile','target']){if(trails[who]){group.remove(trails[who]);trails[who].geometry.dispose();trails[who].material.dispose();trails[who]=null;}if(result?.samples.length){trails[who]=addLine(result.samples.map(s=>s[who].pos),who==='projectile'?GOLD:MINT,.67);trails[who].geometry.setDrawRange(0,1);}}}
 function drawProjection(projection,state){
  const {canvas,ctx,host,axis}=projection,width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight),dpr=Math.min(devicePixelRatio,2);if(width<40||height<30)return;
  if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle=BG;ctx.fillRect(0,0,width,height);
  const pad=18,rangeX=bounds.max.x-bounds.min.x,rangeY=bounds.max.getComponent(axis)-bounds.min.getComponent(axis),scale=Math.min((width-2*pad)/rangeX,(height-2*pad)/rangeY),cx=(bounds.min.x+bounds.max.x)/2,cy=(bounds.min.getComponent(axis)+bounds.max.getComponent(axis))/2;
  const xy=p=>[width/2+(p[0]-cx)*scale,height/2-(p[axis]-cy)*scale];
  function line(points,color,lineWidth=1,dash=[]){if(points.length<2)return;ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.setLineDash(dash);ctx.beginPath();points.forEach((p,i)=>{const [x,y]=xy(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.setLineDash([]);}
  function circle(p,r,color,fill=false){const [x,y]=xy(p);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.2;fill?ctx.fill():ctx.stroke();}
  function arrow2(from,to,color){const [ax,ay]=xy(from),[bx,by]=xy(to),length=Math.hypot(bx-ax,by-ay);if(length<3)return;line([from,to],color);const dx=(bx-ax)/length,dy=(by-ay)/length;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx-5*dx+2.5*dy,by-5*dy-2.5*dx);ctx.lineTo(bx-5*dx-2.5*dy,by-5*dy+2.5*dx);ctx.closePath();ctx.fill();}
  line([options.start,options.target],'#78989c55',1,[3,4]);circle(options.target,Math.max(3,options.radius*scale),'#89e3cd44');
  if(history)for(const who of ['projectile','target'])line(history.samples.map(s=>s[who].pos),'#8b9aa94d',1,[3,4]);
  if(result)for(const who of ['projectile','target']){const points=result.samples.slice(0,trailCount).map(s=>s[who].pos);points.push(state[who].pos);line(points,who==='projectile'?GOLD:MINT,1.35);}
  if(ghosts)for(const who of ['projectile','target']){const s=state[who],color=who==='projectile'?GOLD:MINT;circle(s.freePos,2.7,color+'65');arrow2(s.freePos,s.pos,color+'88');}
  circle(state.target.pos,Math.max(4,options.radius*scale),MINT);circle(state.projectile.pos,3,GOLD,true);
  const start=xy(options.start);ctx.fillStyle='#b3c4c9';ctx.fillRect(start[0]-5,start[1]-1.6,5,3.2);
  ctx.font='10px "Microsoft YaHei",sans-serif';ctx.fillStyle='#607f90';ctx.fillText(axis===1?'y':'z',8,13);ctx.fillText('x',width-13,height-7);
  host.dataset.projectile=JSON.stringify(state.projectile.pos);host.dataset.target=JSON.stringify(state.target.pos);
 }
 function draw(value=0){
  if(disposed)return;time=Math.max(0,value);const state=aimState(time,options),p=state.projectile,t=state.target,direction=vector(aimVelocity(options)).normalize();
  projectile.position.set(...p.pos);projectile.scale.setScalar(Math.pow(options.massUnits,.25));target.position.set(...t.pos);target.quaternion.copy(camera.quaternion);initialTarget.position.set(...options.target);initialTarget.quaternion.copy(camera.quaternion);initialTarget.visible=ghosts;
  for(const [mesh,s] of [[freeProjectile,p],[freeTarget,t]]){mesh.position.set(...s.freePos);mesh.quaternion.copy(camera.quaternion);mesh.visible=ghosts&&Math.hypot(...s.deflection)>.08;}
  placeArrow(projectileDeflection,p.freePos,p.pos);placeArrow(targetDeflection,t.freePos,t.pos);projectileDeflection.visible&&=ghosts;targetDeflection.visible&&=ghosts;
  setLine(projectileToFree,[p.freePos,p.pos]);setLine(targetToFree,[t.freePos,t.pos]);projectileToFree.visible=targetToFree.visible=ghosts;
  const e=vector(p.E),f=vector(p.F),origin=vector(p.pos);placeArrow(electricArrow,p.pos,origin.clone().add(e.normalize().multiplyScalar(.9)).toArray());placeArrow(forceArrow,p.pos,origin.clone().add(f.normalize().multiplyScalar(.9)).toArray());electricArrow.visible=forceArrow.visible=Math.hypot(...p.E)>0;
  labels.electric.hidden=labels.force.hidden=!electricArrow.visible;
  if(electricArrow.visible){put(labels.electric,origin.clone().add(e.multiplyScalar(1.1)),8,-5);put(labels.force,origin.clone().add(f.multiplyScalar(1.1)),8,5);}
  const together=projectile.position.distanceTo(target.position)<.8;
  put(labels.projectile,projectile.position,-26,-21);put(labels.target,target.position,25,-22);
  labels.target.textContent=options.targetRatio===0?'不带电的靶':'带电靶';
  if(together){labels.projectile.hidden=true;labels.target.hidden=true;}
  for(const [who,s,label] of [['p',p,labels.pShift],['t',t,labels.tShift]]){const magnitude=Math.hypot(...s.deflection);label.textContent=magnitude.toFixed(2)+' mm';if(ghosts&&magnitude>.2&&!together)put(label,vector(s.freePos).lerp(vector(s.pos),.52),who==='p'?-24:28,0);else label.hidden=true;}
  aimPosition=vector(options.start).addScaledVector(direction,4.1);put(aimButton,aimPosition);put(aimCaption,aimPosition,0,28);aimButton.setAttribute('aria-valuenow',String(options.pitchOffset));
  const fieldPosition=fieldBase.clone().add(vector([0,options.E[1]/240*3,0]));put(fieldButton,fieldPosition);put(fieldCaption,fieldPosition,0,29);fieldCaption.textContent=options.E[1]+' V/m';fieldButton.setAttribute('aria-valuenow',String(options.E[1]));
  gun.position.copy(vector(options.start).addScaledVector(direction,-.36));gun.quaternion.setFromUnitVectors(vector([0,0,1]),direction);setLine(aimLine,[options.start,aimPosition]);
  trailCount=result?result.samples.filter(s=>s.time<=time+1e-9).length:0;for(const who of ['projectile','target'])if(trails[who])trails[who].geometry.setDrawRange(0,Math.max(1,trailCount));
  mainHost.dataset.time=String(time);mainHost.dataset.projectile=JSON.stringify(p.pos);mainHost.dataset.target=JSON.stringify(t.pos);mainHost.dataset.projectileDeflection=JSON.stringify(p.deflection);mainHost.dataset.targetDeflection=JSON.stringify(t.deflection);mainHost.dataset.visibleTrailPoints=String(trailCount);
  orbit.update();renderer.render(scene,camera);projections.forEach(projection=>drawProjection(projection,state));return state;
 }
 const resizeObserver=new ResizeObserver(()=>{const width=Math.max(1,mainHost.clientWidth),height=Math.max(1,mainHost.clientHeight);renderer.setSize(width,height,false);fitCamera();draw(time);});resizeObserver.observe(mainHost);projections.forEach(p=>resizeObserver.observe(p.host));
 let raf=0;function renderLoop(){if(disposed)return;draw(time);raf=requestAnimationFrame(renderLoop);}buildTarget();fitResult();renderLoop();
 return {
  setOptions(value){options=aimOptions(value);result=null;time=0;buildTarget();setLine(sightLine,[options.start,options.target]);makeTrails();fitResult();draw(0);},
  setResult(value){result=value;options=aimOptions(value.options);makeTrails();fitResult();draw(0);},
  remember(value){clearGroup(historyGroup);history=value||null;if(history?.samples?.length)for(const who of ['projectile','target'])addLine(history.samples.map(s=>s[who].pos),'#8b9aa9',.25,true,historyGroup);mainHost.dataset.historyCount=String(history?.samples?.length||0);fitResult();draw(time);},
  clearHistory(){clearGroup(historyGroup);history=null;mainHost.dataset.historyCount='0';fitResult();draw(time);},
  draw,setGhosts(value){ghosts=Boolean(value);draw(time);},
  resetView(){fitCamera(false);draw(time);},
  dispose(){disposed=true;cancelAnimationFrame(raf);resizeObserver.disconnect();orbit.dispose();scene.traverse(object=>{object.geometry?.dispose();if(object.material)for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();});renderer.dispose();renderer.domElement.remove();overlay.remove();projections.forEach(p=>p.canvas.remove());}
 };
}
