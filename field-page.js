import {FieldScene,THREE,slider} from './scene.js';
import {fieldAt} from './physics.js';
import {buildVectorLattice} from './field-vectors.js';
import {observationFrame} from './field-frame.js';
import {FIELD_CHALLENGES,evaluateFieldChallenge,advanceFieldChallenge} from './field-challenge.js';
const norm=v=>Math.hypot(...v);
export function mountField(container){
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='./field.css';document.head.append(sheet);
 container.classList.add('field-v4');
 container.innerHTML=`
 <div class="field-preset-row" role="group" aria-label="选择两个源电荷">
  <button data-preset="dipole" class="active" aria-pressed="true"><strong>＋ −　异号</strong></button>
  <button data-preset="same" aria-pressed="false"><strong>＋ ＋　同号</strong></button>
 </div>
 <div class="field-toolbar"><button id="field-visible" aria-pressed="true">空间电场：已显示</button><button id="probe-visible" aria-pressed="true">观察点受力：已显示</button><div class="field-probe-sign" role="group" aria-label="试探电荷的符号"><button data-sign="-1" class="active" aria-pressed="true">电子 −</button><button data-sign="1" aria-pressed="false">正试探电荷</button></div><button id="reset-sources">恢复起点</button></div>
 <div class="stage-wrap"><div class="stage"></div><div class="stage-top"><div class="scene-label"><strong>拖动黄点 P，看这里的受力</strong></div><div class="view-switch"><button data-field-view="space" class="active">三维空间</button><button data-field-view="plane">过 P 的剖面</button></div></div><div class="stage-bottom"><div class="hint-chip" id="field-gesture">点击空白放置 P · 拖动源或黄点 · 滚轮缩放</div></div><div class="field-probe-caption" id="probe-info"></div><div class="field-direction-key"><span class="electric">青色 E · 电场方向</span><span class="electron">金色 F · 电子受力</span><strong id="field-sign-reason">电子带负电，受力与电场反向</strong></div><label class="field-depth" for="probe-z">P 前后 <output id="probe-z-value">0.8 mm</output><input id="probe-z" type="range" min="-2.5" max="2.5" step="0.1" value="0.8"></label><div class="field-dynamic-note">剖面穿过 Q₁、Q₂ 和 P</div></div>
 <div class="field-results" id="field-results"><div><span class="field-key one">E₁</span><small>左源在 P 的贡献</small><strong id="e1-value"></strong></div><span class="field-math">＋</span><div><span class="field-key two">E₂</span><small>右源在 P 的贡献</small><strong id="e2-value"></strong></div><span class="field-math">＝</span><div><span class="field-key total">E</span><small>黄点 P 的合场</small><strong id="field-value"></strong></div><div class="field-force"><span>F = qE</span><small id="force-note"></small><strong id="force-value"></strong></div></div>
 <p class="field-observation" id="field-observation" aria-live="polite"></p>
 <p class="field-engine-link"><a href="engine.html">Godot 空间版 →</a></p><details class="field-adjust"><summary>参数</summary><div class="field-adjust-grid"><section><h3>改变两个源</h3>${slider('q1','左源 Q₁',-.6,.6,.05,.3,'pC')}${slider('q2','右源 Q₂',-.6,.6,.05,-.3,'pC')}<button id="field-auto-btn" aria-pressed="false">让左源往复</button><button id="single-source">只看一个电荷</button><p class="small">单电荷用于比较一个源的贡献；上方两种双电荷情形才是叠加实验。</p></section><section><h3>移动黄点 P</h3>${slider('probe-x','左右位置',-4.5,4.5,.1,0,'mm')}${slider('probe-y','上下位置',-3.5,3.5,.1,1.2,'mm')}<label class="check"><input id="source-guides" type="checkbox" checked>显示源到 P 的虚线</label><p class="small">虚线连接源和观察点。正源贡献背离源，负源贡献指向源；在 P 把两个矢量相加。</p></section></div></details>
 <details class="field-notes"><summary>说明</summary><div class="learn-row"><details class="learning"><summary>这里相加的是什么？</summary><p>相加的是两个源在同一个观察点产生的电场 E₁、E₂。空间箭头是在固定三维格点测得的场；淡色剖面始终经过两个源和 P，剖面按钮将同一平面转到正面。转动镜头不改变任何位置的场。把很小的试探电荷放在 P，才用 F=qE 求它的受力；试探电荷不改变这里的源电场。</p><p>黄点选择 ±e，受力读数按元电荷计算。分场与合场采用同一局部尺度，虚线构成矢量平行四边形；背景场另作长度压缩。F 箭头只表示方向，不能把力与场的箭头长度当作同单位比较。</p></details><details class="learning"><summary>电荷移动，与扰动传播有什么不同？</summary><p>本页展示不同源位置对应的静电状态，没有传播延迟。振荡源产生的辐射场放在进阶实验中。</p><a href="charge.html#propagation">进阶：振荡与传播 →</a></details></div></details>`;
 const $=s=>container.querySelector(s),view=new FieldScene($('.stage'),{extent:6});
 const challengePanel=document.createElement('div');challengePanel.className='field-challenge';challengePanel.innerHTML=`<button id="field-challenge-start">◎ 找一个受力位置</button><div class="field-challenge-task" hidden><div class="field-challenge-title" id="field-challenge-title"></div><div class="field-challenge-feedback"><span class="field-challenge-meter" aria-hidden="true"></span><span id="field-challenge-state" role="status" aria-live="polite">拖动黄点 P</span><span class="field-challenge-check" hidden>✓</span></div><div class="field-challenge-actions"><button id="field-challenge-next">换个目标 →</button><button id="field-challenge-exit">自由探索</button></div></div>`;$('.stage-wrap').append(challengePanel);
 view.scene.background.set('#000');view.scene.fog.color.set('#000');view.grid.visible=false;view.layer('axes').visible=false;view.controls.enablePan=false;
 let viewMode='space';
 function setView(mode){viewMode=mode;const d=Math.max(14,6.5/(Math.tan(19*Math.PI/180)*view.camera.aspect));view.controls.target.set(0,0,0);view.camera.up.set(0,1,0);if(mode==='plane'){const f=frame();view.camera.position.fromArray(f.normal).multiplyScalar(d);view.camera.up.fromArray(f.v);}else view.camera.position.set(d*.35,d*.30,d*.88);view.camera.lookAt(0,0,0);view.controls.enabled=true;view.controls.update();view.controls.enableRotate=mode==='space';view.renderer.domElement.dataset.viewMode=mode;container.querySelectorAll('[data-field-view]').forEach(b=>{const on=b.dataset.fieldView===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on)});$('#field-gesture').textContent=mode==='plane'?'拖动源或 P · 滚轮缩放':'拖空白旋转 · 拖动源或 P';if(typeof volume!=='undefined'){volume.group.visible=showField&&mode==='space';vectors.group.visible=showField&&mode==='plane';}}
 const resize=view.resize.bind(view);view.resize=()=>{resize();if(ready)setView(viewMode);};let ready=false;
 const surface=new THREE.Mesh(new THREE.PlaneGeometry(12,8),new THREE.MeshBasicMaterial({color:'#42667a',transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false}));view.layer('sampling-plane').add(surface);
 let sign=-1,sources=[{id:'Q1',label:'Q₁',pos:[-1.8,0,0],Q:.3,radius:.24},{id:'Q2',label:'Q₂',pos:[1.8,0,0],Q:-.3,radius:.24}],showField=true,showProbe=true,moving=false,clock=0,base=0,last=0,lastDraw=0,dirty=false,drag=null;
 let challenge=null,challengeProgress=null,challengeEvaluation=null,challengeSnapshot=null,challengeRing=null,challengeSuccessAt=-Infinity;
 const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function probe(){return [+$('#probe-x').value,+$('#probe-y').value,+$('#probe-z').value]}
 function frame(){return observationFrame(sources[0].pos,sources[1].pos,probe());}
 const vectors=buildVectorLattice(view,THREE,()=>sources,{plane:'xy',step:.55,getFrame:frame}),volume=buildVectorLattice(view,THREE,()=>sources,{plane:'volume',step:.85}),canvas=view.renderer.domElement;
 function challengeControls(active){
  container.classList.toggle('field-challenge-active',active);$('#field-challenge-start').hidden=active;$('.field-challenge-task').hidden=!active;
  container.querySelectorAll('[data-preset],[data-sign],#q1,#q2,#field-auto-btn,#single-source,#reset-sources').forEach(el=>el.disabled=active);
  $('.scene-label strong').textContent=active?'拖动黄点 P':'拖动黄点 P，看这里的受力';surface.visible=!active;
 }
 function beginChallenge(id='force-direction'){
  if(!challengeSnapshot)challengeSnapshot={sources:structuredClone(sources),sign,showProbe,showField,viewMode,values:Object.fromEntries(['q1','q2','probe-x','probe-y','probe-z'].map(k=>[k,$('#'+k).value])),preset:container.querySelector('[data-preset].active')?.dataset.preset};
  preset('same');sign=-1;showProbe=true;showField=true;$('#field-visible').textContent='空间电场：已显示';$('#field-visible').setAttribute('aria-pressed','true');container.querySelectorAll('[data-sign]').forEach(b=>{const active=+b.dataset.sign===sign;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
  challenge=FIELD_CHALLENGES.find(g=>g.id===id)||FIELD_CHALLENGES[0];challengeProgress=null;challengeEvaluation=null;challengeSuccessAt=-Infinity;
  ['probe-x','probe-y','probe-z'].forEach((k,i)=>$('#'+k).value=challenge.start[i]);
  $('#field-challenge-title').textContent=challenge.title;challengeControls(true);setView('space');rebuild();
 }
 function exitChallenge(){
  challenge=null;challengeProgress=null;challengeEvaluation=null;challengeRing=null;view.clearLayer('challenge-target');challengeControls(false);
  if(challengeSnapshot){const saved=challengeSnapshot;sources=structuredClone(saved.sources);sign=saved.sign;showProbe=saved.showProbe;showField=saved.showField;$('#field-visible').textContent='空间电场：'+(showField?'已显示':'已隐藏');$('#field-visible').setAttribute('aria-pressed',String(showField));Object.entries(saved.values).forEach(([k,v])=>$('#'+k).value=v);container.querySelectorAll('[data-preset]').forEach(b=>{const active=b.dataset.preset===saved.preset;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});container.querySelectorAll('[data-sign]').forEach(b=>{const active=+b.dataset.sign===sign;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});challengeSnapshot=null;values();setView(saved.viewMode);rebuild();}
  for(const el of [container,canvas]){el.dataset.challengeId='';el.dataset.challengeCurrentMatch='false';el.dataset.challengeCompleted='false';el.dataset.challengeHold='0';el.dataset.challengeAngle='';el.dataset.challengePlaneDeviation='';}
 }
 function drawChallengeTarget(p){
  view.clearLayer('challenge-target');challengeRing=null;if(!challenge)return;
  const color='#83e8c1',layer='challenge-target';
  if(challenge.kind==='direction'){
   // Four open faces make a hollow +y arrow: its direction remains visible
   // when the camera turns, while the gold force arrow stays visually separate.
   const tip=[p[0],p[1]+1.95,p[2]],neck=p[1]+1.53;
   for(const [dx,dz] of [[.055,0],[-.055,0],[0,.055],[0,-.055]])view.line([[p[0]+dx,p[1]+.24,p[2]+dz],[p[0]+dx,neck,p[2]+dz]],color,layer,.75);
   for(const [dx,dz] of [[.22,0],[-.22,0],[0,.22],[0,-.22]])view.line([[p[0],neck,p[2]],[p[0]+dx,neck,p[2]+dz],tip],color,layer,.85);
   view.label('目标 +y',[p[0]+.5,p[1]+2.12,p[2]],color,layer,.28);
  }else{
   const target=new THREE.Mesh(new THREE.PlaneGeometry(6.4,5),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.045,side:THREE.DoubleSide,depthWrite:false}));target.rotation.y=Math.PI/2;view.layer(layer).add(target);
   view.line([[0,-2.5,-3.2],[0,2.5,-3.2],[0,2.5,3.2],[0,-2.5,3.2],[0,-2.5,-3.2]],color,layer,.46);
   view.dashedLine([[0,-2.5,0],[0,2.5,0]],color,layer,.25);view.dashedLine([[0,0,-3.2],[0,0,3.2]],color,layer,.25);
   view.label('目标 YZ 面',[0,2.8,-2.4],color,layer,.29);
  }
  challengeRing=new THREE.Mesh(new THREE.RingGeometry(.24,.265,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));challengeRing.position.fromArray(p);challengeRing.quaternion.copy(view.camera.quaternion);view.layer(layer).add(challengeRing);
  challengeEvaluation=evaluateFieldChallenge(challenge.id,{position:p,sources,chargeSign:sign});
  for(const el of [container,canvas]){el.dataset.challengeId=challenge.id;el.dataset.challengeAngle=challengeEvaluation.angle==null?'':String(challengeEvaluation.angle*180/Math.PI);el.dataset.challengePlaneDeviation=challengeEvaluation.deviation==null?'':String(challengeEvaluation.deviation);}
 }
 function tickChallenge(dt,t){
  if(!challenge||!challengeEvaluation)return;
  challengeProgress=advanceFieldChallenge(challengeProgress,challengeEvaluation.matched,dt*1000);
  if(challengeProgress.newlyCompleted)challengeSuccessAt=t;
  const current=challengeProgress.matched,completed=challengeProgress.completed;
  challengePanel.classList.toggle('is-matched',current);challengePanel.classList.toggle('is-complete',completed);challengePanel.style.setProperty('--hold',challengeProgress.progress);
  $('.field-challenge-check').hidden=!completed;
  const status=current?(challengeProgress.heldMs>=600?'找到了':'停在这里'):challengeEvaluation.reason==='near-source'?'离源电荷远一点':challengeEvaluation.reason==='outside'?'回到电场中央':challengeEvaluation.reason==='zero-field'?'这里受力为零':'拖动黄点 P';
  if($('#field-challenge-state').textContent!==status)$('#field-challenge-state').textContent=status;
  if(challengeRing){challengeRing.visible=current;challengeRing.quaternion.copy(view.camera.quaternion);const pulse=!reduceMotion&&t-challengeSuccessAt<1100?Math.sin(Math.PI*(t-challengeSuccessAt)/550)**2:0;challengeRing.scale.setScalar(1+pulse*.28);challengeRing.material.opacity=.28+.45*challengeProgress.progress+.2*pulse;}
  for(const el of [container,canvas]){el.dataset.challengeCurrentMatch=String(current);el.dataset.challengeCompleted=String(completed);el.dataset.challengeHold=String(Math.round(challengeProgress.heldMs));}
 }
 $('#field-challenge-start').onclick=()=>beginChallenge();$('#field-challenge-next').onclick=()=>beginChallenge(FIELD_CHALLENGES[(FIELD_CHALLENGES.findIndex(g=>g.id===challenge?.id)+1)%FIELD_CHALLENGES.length].id);$('#field-challenge-exit').onclick=exitChallenge;
 function updatePlane(){const f=frame(),basis=new THREE.Matrix4().makeBasis(new THREE.Vector3(...f.u),new THREE.Vector3(...f.v),new THREE.Vector3(...f.normal));surface.position.fromArray(f.origin);surface.quaternion.setFromRotationMatrix(basis);vectors.update();}
 ready=true;container.querySelectorAll('[data-field-view]').forEach(b=>b.onclick=()=>setView(b.dataset.fieldView));setView('space');
 function drawProbe(){
  updatePlane();view.clearLayer('probe');view.clearLayer('guides');const p=probe(),parts=sources.map(s=>fieldAt(p,[s]).E),E=fieldAt(p,sources).E,m=norm(E),scale=1.65/Math.max(m,...parts.map(norm),1);
  view.layer('probe').visible=showProbe;view.layer('guides').visible=showProbe;
  const marker=new THREE.Mesh(new THREE.SphereGeometry(.12,24,16),new THREE.MeshBasicMaterial({color:'#f2cb73'}));marker.position.set(...p);marker.userData={pickable:true,probe:true};view.layer('probe').add(marker);view.label(sign<0?'P · −e':'P · +e',[p[0]-.18,p[1]+.34,p[2]],'#f2cb73','probe',.30);
  const hitArea=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hitArea.position.set(...p);hitArea.userData={probe:true};view.layer('probe').add(hitArea);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.19,.21,48),new THREE.MeshBasicMaterial({color:'#f2cb73',transparent:true,opacity:.75,side:THREE.DoubleSide,depthTest:false}));ring.position.set(...p);ring.quaternion.copy(view.camera.quaternion);view.layer('probe').add(ring);
  if(showProbe){
   if($('#source-guides').checked)sources.filter(s=>Math.abs(s.Q)>1e-8).forEach((s,i)=>view.dashedLine([s.pos,p],i?'#6db2e4':'#eb9b85','guides',.7));
   parts.forEach((e,i)=>view.arrow(p,e,i?'#80bfff':'#ffa58d',norm(e)*scale,'probe'));
   const tip1=p.map((v,i)=>v+parts[0][i]*scale),tip2=p.map((v,i)=>v+parts[1][i]*scale),tip=p.map((v,i)=>v+E[i]*scale);
   if(norm(parts[0])>1e-6&&norm(parts[1])>1e-6){view.dashedLine([tip1,tip],'#80bfff','probe',.45);view.dashedLine([tip2,tip],'#ffa58d','probe',.45);}
   view.arrow(p,E,'#67dce5',m*scale,'probe');
   if(m>1e-6){view.label('电场 E',tip.map((v,i)=>v+(i===1?.19:0)),'#67dce5','probe',.28);if(sign<0){const f=E.map(v=>-v);view.arrow(p,f,'#f2cb73',m*scale,'probe');view.label('电子受力 F',p.map((v,i)=>v+f[i]*scale+(i===1?.19:0)),'#f2cb73','probe',.28);}}
  }
  $('#field-sign-reason').textContent=sign<0?'电子带负电，受力与电场反向':'正试探电荷：受力与电场同向';$('.field-direction-key .electron').textContent=sign<0?'金色 F · 电子受力':'F = qE · 与电场同向';
  $('#e1-value').textContent=norm(parts[0]).toFixed(1)+' V/m';$('#e2-value').textContent=norm(parts[1]).toFixed(1)+' V/m';$('#field-value').textContent=m.toFixed(1)+' V/m';$('#force-value').textContent=(m*1.602176634e-4).toFixed(3)+' fN';$('#force-note').textContent=sign<0?'电子：力与 E 反向':'正试探电荷：力与 E 同向';
  $('#probe-info').hidden=!showProbe;$('#field-results').hidden=!showProbe;
  $('#probe-info').innerHTML=`<strong>P = (${p.map(v=>v.toFixed(1)).join(', ')}) mm</strong><span><i class="one"></i>E₁　<i class="two"></i>E₂　<i class="total"></i>合场 E</span><small>${sign<0?'金色 F 与合场反向':'正试探电荷的力沿合场 E'}</small>`;
  const zero=m<.02;
  $('#field-observation').textContent=zero?'P 点两个贡献相互抵消：E = 0，F = 0；附近仍然有电场。':sources[0].Q*sources[1].Q>0?(Math.abs(sources[0].Q-sources[1].Q)<1e-8?'两个等量同号源的中点，合场抵消。拖动黄点，看离开中点后的变化。':'同号源之间，两个贡献方向相反；电量不等时，抵消点不在几何中点。'):Math.abs(sources[1].Q)<1e-8?'现在只看一个源。切回上方双电荷情形，比较第二个源增加的作用。':'正源贡献向外，负源贡献向内。沿两条源—P 连线读出分场，再看它们的矢量和。';
  for(const id of ['probe-x','probe-y','probe-z'])$('#'+id+'-value').textContent=(+$('#'+id).value).toFixed(1)+' mm';
  canvas.dataset.samplePlane='through-sources-and-probe';canvas.dataset.viewMode=viewMode;canvas.dataset.planeNormal=JSON.stringify(frame().normal);canvas.dataset.vectorE=JSON.stringify(E);canvas.dataset.vectorF=JSON.stringify(E.map(v=>v*sign*1.602176634e-19));canvas.dataset.field=m.toFixed(6);canvas.dataset.forceSign=sign;canvas.dataset.probe=JSON.stringify(p);canvas.dataset.sources=JSON.stringify(sources.map(s=>s.pos));
  drawChallengeTarget(p);
 }
 function rebuild(){view.clearLayer('charges');sources.filter(s=>Math.abs(s.Q)>1e-8).forEach(s=>view.charge(s));vectors.update();volume.update();view.layer('field-vectors').visible=showField;drawProbe();dirty=false;}
 function values(){sources.forEach((s,i)=>s.Q=+$('#q'+(i+1)).value);for(const id of ['q1','q2'])$('#'+id+'-value').textContent=(+$('#'+id).value).toFixed(2)+' pC';}
 function stop(){moving=false;$('#field-auto-btn').textContent='让左源往复';$('#field-auto-btn').setAttribute('aria-pressed','false');}
 function resetPositions(){stop();sources[0].pos=[-1.8,0,0];sources[1].pos=[1.8,0,0];$('#probe-x').value=0;$('#probe-y').value=1.2;$('#probe-z').value=.8;}
 function preset(name){resetPositions();$('#q1').value=.3;$('#q2').value=name==='dipole'?-.3:name==='same'?.3:0;container.querySelectorAll('[data-preset]').forEach(b=>{const active=b.dataset.preset===name;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});values();rebuild();}
 container.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>preset(b.dataset.preset));
 for(const id of ['q1','q2'])$('#'+id).oninput=()=>{values();container.querySelectorAll('[data-preset]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});rebuild();};
 for(const id of ['probe-x','probe-y','probe-z'])$('#'+id).oninput=()=>{drawProbe();if(viewMode==='plane')setView('plane')};
 $('#source-guides').onchange=drawProbe;
 $('#field-visible').onclick=()=>{showField=!showField;view.layer('field-vectors').visible=showField;$('#field-visible').textContent='空间电场：'+(showField?'已显示':'已隐藏');$('#field-visible').setAttribute('aria-pressed',showField);};
 $('#probe-visible').onclick=()=>{showProbe=!showProbe;$('#probe-visible').textContent='观察点受力：'+(showProbe?'已显示':'已隐藏');$('#probe-visible').setAttribute('aria-pressed',showProbe);drawProbe();};
 container.querySelectorAll('[data-sign]').forEach(b=>b.onclick=()=>{sign=+b.dataset.sign;container.querySelectorAll('[data-sign]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b)});drawProbe();});
 $('#single-source').onclick=()=>preset('single');$('#reset-sources').onclick=()=>{resetPositions();rebuild();};
 $('#field-auto-btn').onclick=()=>{moving=!moving;clock=0;base=sources[0].pos[1];$('#field-auto-btn').textContent=moving?'暂停往复':'让左源往复';$('#field-auto-btn').setAttribute('aria-pressed',moving);};
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0),point=new THREE.Vector3();
 function cast(e){const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,view.camera);}
 function down(e){cast(e);const charge=!challenge&&ray.intersectObjects(view.layer('charges').children).find(h=>h.object.userData.source),hit=showProbe?ray.intersectObjects(view.layer('probe').children).find(h=>h.object.userData.probe):null;if(charge||hit){drag=charge?charge.object.userData.source:'probe';const position=drag==='probe'?probe():drag.pos;plane.setFromNormalAndCoplanarPoint(viewMode==='plane'?new THREE.Vector3(...frame().normal):new THREE.Vector3(0,0,1),new THREE.Vector3(...position));stop();view.controls.enabled=false;canvas.setPointerCapture(e.pointerId);}}
 function move(e){if(!drag)return;cast(e);if(ray.ray.intersectPlane(plane,point)){const p=[Math.max(-4.5,Math.min(4.5,point.x)),Math.max(-3,Math.min(3,point.y)),Math.max(-2.5,Math.min(2.5,point.z))];if(drag==='probe'){$('#probe-x').value=p[0];$('#probe-y').value=p[1];$('#probe-z').value=p[2];drawProbe();}else{drag.pos=p;dirty=true;}}}
 let pointerStart=null;
 function recordStart(e){pointerStart=[e.clientX,e.clientY,!!drag];}
 function up(e){const wasDrag=!!drag;drag=null;view.controls.enabled=true;if(e?.type==='pointerup'&&viewMode==='plane'&&!wasDrag&&pointerStart&&!pointerStart[2]&&Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])<5){cast(e);plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(...frame().normal),new THREE.Vector3(...frame().origin));if(ray.ray.intersectPlane(plane,point)){$('#probe-x').value=Math.max(-4.5,Math.min(4.5,point.x));$('#probe-y').value=Math.max(-3.5,Math.min(3.5,point.y));$('#probe-z').value=Math.max(-2.5,Math.min(2.5,point.z));drawProbe();}}pointerStart=null;}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerdown',recordStart);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 view.frameFn=t=>{const dt=Math.min(.05,(t-last)/1000||0);last=t;if(moving){clock+=dt;sources[0].pos[1]=base+Math.min(1.1,Math.max(.05,3-Math.abs(base)))*Math.sin(clock*.9)*(1-Math.exp(-clock*clock*4));dirty=true;}if(dirty&&t-lastDraw>32){rebuild();lastDraw=t;}tickChallenge(dt,t);canvas.dataset.sourceY=sources[0].pos[1].toFixed(3);};
 values();rebuild();
 const requestedChallenge=new URLSearchParams(location.search).get('challenge');if(FIELD_CHALLENGES.some(g=>g.id===requestedChallenge))beginChallenge(requestedChallenge);
 return()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerdown',recordStart);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);vectors.dispose();volume.dispose();view.dispose();sheet.remove();container.classList.remove('field-v4','field-challenge-active');};
}
