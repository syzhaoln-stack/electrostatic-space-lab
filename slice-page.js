import {FieldScene, THREE, stageChrome, bindViews, slider} from './scene.js';
import {fieldAt} from './physics.js';

// Every reading uses the same 3D sphere solution. A reference change subtracts
// one constant everywhere, and never modifies the electric field.
export function mountSlice(container) {
  if (!document.querySelector('link[data-potential-style]')) {
    const sheet=document.createElement('link');sheet.rel='stylesheet';
    sheet.href=new URL('./slice.css',import.meta.url).href;sheet.dataset.potentialStyle='';document.head.append(sheet);
  }
  const stages=[
    {title:'电势是什么',question:'先比较两个位置',hint:'只移动 A，观察它与 B 的电势差'},
    {title:'同值点组成面',question:'这一整张球面，读数都相同',hint:'移动切片 · 右图与空间中的薄片一一对应'},
    {title:'零点可以换',question:'换零点，会把电场一起换掉吗？',hint:'切换右侧的零点约定，观察数值和箭头'},
    {title:'零电势仍有场',question:'读数为零，为什么仍有电场？',hint:'移动中间薄片，看两个电荷的电势怎样相加'}
  ];
  container.innerHTML=`<section class="potential-lab"><nav class="potential-steps" aria-label="电势学习步骤">${stages.map((s,i)=>`<button data-potential-step="${i}" ${i===0?'class="active" aria-current="step"':''}><span>0${i+1}</span>${s.title}</button>`).join('')}</nav><div class="lab-layout"><div class="stage-wrap"><div class="stage"></div>${stageChrome(stages[0].question,stages[0].hint)}<div class="probe-detail" id="potential-scene-note"></div><div class="potential-reference-badge" id="potential-reference-badge"></div></div><aside class="panel" id="potential-panel"></aside></div><div class="formula-strip potential-formula"><div><div class="formula" id="potential-formula"></div><div class="formula-caption" id="potential-formula-caption"></div></div><div class="formula-note" id="potential-formula-note"></div></div><div class="learn-row"><details class="learning"><summary>模型是什么？这些球面是真实物体吗？</summary><p>红、蓝小球是固定、均匀带电的绝缘实心球，半径 0.22 mm，电荷量为 ±0.30 pC。球外的场与同位置点电荷相同。透明球面、切片和箭头是计算结果的可视化，不是物体，也不会挡住电场。观察点不加入会影响源电荷的真实电荷。</p></details><details class="learning"><summary>电势和电势能，怎样区分？</summary><p>电势 V 描述位置；电势能 U 还取决于放入的电荷 q。选定同一零点后，U = qV；两点之间 ΔU = qΔV。正电荷移向较高电势，电势能增加；电子带负电，变化方向相反。这里的能量均指电势能，不能当作动能。</p><p>例如，电势差为 +1 V 时，带电量为 +e 的虚拟试探粒子，电势能增加 1 eV；电子则减少 1 eV。e 是一个基本电荷量，eV 是能量单位。实际运动还要结合初始速度和受力。</p></details></div></section>`;
  const $=selector=>container.querySelector(selector);
  const scene=new FieldScene($('.stage'),{extent:6});bindViews(container,scene);scene.view('iso');
  let step=0,radiusA=2,shellRadius=2.4,offset=0,uv=[2.4,0],reference='infinity';
  const pointB=[4,0,0];
  const single=[{pos:[0,0,0],Q:.3,radius:.22,label:'Q'}];
  const pair=[{pos:[0,2.4,0],Q:.3,radius:.22,label:'+Q'},{pos:[0,-2.4,0],Q:-.3,radius:.22,label:'−Q'}];
  const sources=()=>step===3?pair:single;
  const pointA=()=>step===1?[uv[0],uv[1],offset]:step===3?[uv[0],offset,uv[1]]:[radiusA,0,0];
  const refValue=()=>step===2&&reference==='B'?fieldAt(pointB,single).V:0;
  const volts=p=>fieldAt(p,sources()).V-refValue();
  const formatV=v=>(Math.abs(v)<.0005?'0.000':v.toFixed(3));
  const vectorLength=v=>Math.hypot(...v);
  const planePoint=(u,v)=>step===3?[u,offset,v]:[u,v,offset];
  function point(p,color,caption,layer='measurements',size=.11){const m=new THREE.Mesh(new THREE.SphereGeometry(size,20,16),new THREE.MeshStandardMaterial({color,roughness:.3}));m.position.set(...p);scene.layer(layer).add(m);scene.label(caption,[p[0],p[1]+.43,p[2]],color,layer,.53);}
  function dash(points,color,layer='measurements'){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const line=new THREE.Line(geo,new THREE.LineDashedMaterial({color,dashSize:.12,gapSize:.09,transparent:true,opacity:.72}));line.computeLineDistances();scene.layer(layer).add(line);}
  function ring(r,z,color,layer='surface',axis='z'){const points=Array.from({length:97},(_,i)=>{const a=i/96*Math.PI*2;return axis==='z'?[r*Math.cos(a),r*Math.sin(a),z]:axis==='y'?[r*Math.cos(a),z,r*Math.sin(a)]:[z,r*Math.cos(a),r*Math.sin(a)]});return scene.line(points,color,layer,.82);}
  function selectedSurface(){
    scene.layer('surface').add(new THREE.Mesh(new THREE.SphereGeometry(shellRadius,64,40),new THREE.MeshBasicMaterial({color:'#1d999a',transparent:true,opacity:.075,side:THREE.DoubleSide,depthWrite:false})));
    for(const axis of ['x','y','z'])ring(shellRadius,0,'#a2c5c7','surface',axis);
    const s=shellRadius/Math.sqrt(2);[[-s,s,0],[0,s,s],[-s,0,-s]].forEach(p=>point(p,'#087e8b',`${formatV(volts(p))} V`,'surface',.065));
    if(Math.abs(offset)<shellRadius){const r=Math.sqrt(shellRadius**2-offset**2),points=Array.from({length:64},(_,i)=>new THREE.Vector3(r*Math.cos(i/64*Math.PI*2),r*Math.sin(i/64*Math.PI*2),offset));const curve=new THREE.CatmullRomCurve3(points,true);scene.layer('intersection').add(new THREE.Mesh(new THREE.TubeGeometry(curve,128,.018,6,true),new THREE.MeshBasicMaterial({color:'#087e8b'})));}
  }
  function referenceSurface(){
    // Keep this geometric surface fixed while its displayed voltage changes.
    const r=4;scene.layer('surface').add(new THREE.Mesh(new THREE.SphereGeometry(r,48,32),new THREE.MeshBasicMaterial({color:'#1d999a',transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false})));
    for(const axis of ['x','z'])ring(r,0,'#b0cbce','surface',axis);
    const p=[-r/Math.sqrt(2),r/Math.sqrt(2),0];point(p,'#087e8b',`同一层：${formatV(volts(p))} V`,'surface',.065);
  }
  function plane(){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(9,9),new THREE.MeshBasicMaterial({color:'#bedbdd',transparent:true,opacity:.20,side:THREE.DoubleSide,depthWrite:false}));if(step===3){mesh.rotation.x=-Math.PI/2;mesh.position.y=offset;}else mesh.position.z=offset;scene.layer('slice').add(mesh);scene.line([planePoint(-4.5,-4.5),planePoint(4.5,-4.5),planePoint(4.5,4.5),planePoint(-4.5,4.5),planePoint(-4.5,-4.5)],'#79aab1','slice',.7);scene.pickPlane.set(new THREE.Vector3(...(step===3?[0,1,0]:[0,0,1])),-offset);scene.label(step===3?`这张切片：y = ${offset.toFixed(2)} mm`:`这张切片：z = ${offset.toFixed(2)} mm`,planePoint(-.3,-4.3),'#426d79','slice',.28);}
  function renderModel(){
    for(const name of ['charges','measurements','surface','intersection','slice','potential-vectors'])scene.clearLayer(name);
    sources().forEach(s=>scene.charge(s));const p=pointA(),f=fieldAt(p,sources());
    if(step===1){selectedSurface();plane();}if(step===2)referenceSurface();if(step===3)plane();
    if(step===0||step===2){dash([[0,0,0],pointB],'#91a6ad');point(pointB,'#6a7f90',`B  ${formatV(volts(pointB))} V`);scene.label(`A 距源 ${radiusA.toFixed(2)} mm`,[radiusA/2,-.55,0],'#7d8f98','measurements',.40);}
    point(p,'#a67519',`A  ${formatV(volts(p))} V`);
    if(step===2||step===3){scene.arrow(p,f.E,'#087e8b',1.35,'potential-vectors');const direction=new THREE.Vector3(...f.E).normalize().multiplyScalar(1.5).add(new THREE.Vector3(...p));scene.label('E 的方向',direction.toArray(),'#087e8b','potential-vectors',.43);}
    if(step===3)pair.forEach((s,i)=>{dash([s.pos,p],i?'#3689b2':'#d75f4f');const m=s.pos.map((x,j)=>(x+p[j])/2);scene.label(`距${i?'负':'正'}电荷 ${vectorLength(p.map((x,j)=>x-s.pos[j])).toFixed(2)} mm`,m,i?'#3689b2':'#b15b4a','measurements',.39);});
    renderReadings();drawPlot();
  }
  function renderPanel(){
    const header=`<div class="eyebrow">${step+1} / 4 · 一次弄清一件事</div><h2>${stages[step].title}</h2>`;let content='';
    if(step===0)content=`<p class="potential-definition"><strong>电势：把位置带来的能量，按电荷量折算。</strong>这种由电荷位置决定的能量叫作电势能 U。选定参考零点，再用 <span class="potential-inline-formula">V = U / q</span>。<br><span class="potential-unit">1 V = 1 J/C，读作“每库仑对应多少焦耳”。</span></p><div class="potential-small-callout">本例把<strong>无限远处</strong>的电势定为 0。A、B 是两个观察位置。</div>${slider('potential-distance','只移动 A：离源电荷多远',.8,3.6,.02,radiusA,'mm')}<div class="readouts"><div class="readout"><span>A 的电势</span><strong id="potential-a">—</strong><small>V</small></div><div class="readout"><span>B 的电势</span><strong id="potential-b">—</strong><small>V</small></div></div><div class="potential-result"><span>A 比 B 高多少？</span><strong id="potential-difference"></strong><small>这就是两点的电势差 V<sub>A</sub> − V<sub>B</sub>。</small></div><p id="potential-observation" class="potential-observation"></p>`;
    if(step===1)content=`<p class="potential-definition">把<strong>电势相同的所有位置</strong>连起来，就是<strong>等势面</strong>。本例是一个球面，处处读作 <strong id="surface-voltage"></strong>。</p><p>移动薄片，看它与球面的交线。右图只画薄片上的内容。</p>${slider('slice-offset','把切片移出球心',0,3.6,.02,offset,'mm')}<div class="plot-label"><span id="slice-label"></span><span>同一张切片 ↓</span></div><canvas id="slice-plot" class="mini-canvas" width="360" height="360" tabindex="0" aria-label="电势球面的截面图。点击选择观察点，方向键微调。"></canvas><div class="potential-plot-key"><i></i>绿色圆：同一等势面的截线</div><div class="potential-result" id="slice-result"></div><button id="align-slice" class="potential-wide">正对切片，看教材图</button><details class="potential-extra"><summary>换一层球面</summary><div class="potential-radius-options">${[1.4,2.4,3.4].map(r=>`<button data-shell="${r}" ${r===shellRadius?'class="active"':''}>${r} mm</button>`).join('')}</div></details>`;
    if(step===2)content=`<p class="potential-definition">电势的<strong>零点由我们选定</strong>。把 B 改记为 0，所有位置的电势一起减去同一个数。经过 B 的透明球面还在原处，整层的读数一起改变。</p><div class="potential-reference-options"><button id="reference-infinity" data-reference="infinity" class="${reference==='infinity'?'active':''}"><span>约定一</span><strong>无限远为 0</strong><small>A：${formatV(fieldAt(pointA(),single).V)} V<br>B：${formatV(fieldAt(pointB,single).V)} V</small></button><button id="reference-b" data-reference="B" class="${reference==='B'?'active':''}"><span>约定二</span><strong>B 点为 0</strong><small>A：${formatV(fieldAt(pointA(),single).V-fieldAt(pointB,single).V)} V<br>B：0.000 V</small></button></div><div class="potential-result"><span>换零点后，以下两项不变</span><div class="potential-invariants"><div><small>A 与 B 的电势差</small><strong id="potential-difference"></strong></div><div><small>A 处的电场大小</small><strong id="potential-field"></strong></div></div></div><p class="potential-observation">箭头仍指向同一方向。<strong>“0 V”是相对于选定零点的读数，不能据此说没有电场。</strong></p>`;
    if(step===3)content=`<p class="potential-definition">正负电荷等量、位置对称，仍约定<strong>无限远为 0</strong>。在中间平面，每一点到两源距离相等。</p><div class="potential-sum" aria-label="两个电荷的电势贡献"><span class="positive">正电荷贡献<strong id="positive-v"></strong></span><b>＋</b><span class="negative">负电荷贡献<strong id="negative-v"></strong></span><b>＝</b><span>这里的电势<strong id="potential-a"></strong></span></div>${slider('slice-offset','让薄片离开中间位置',-.9,.9,.02,offset,'mm')}<button id="zero-plane" class="potential-wide">回到正中间</button><div class="readouts"><div class="readout"><span>穿过薄片的电场</span><strong id="potential-field"></strong><small>V/m</small></div><div class="readout"><span>薄片内的电场</span><strong id="potential-inplane"></strong><small>V/m</small></div></div><div class="potential-result" id="potential-observation"></div><p class="small">箭头表示电场方向，即正试探电荷受力的方向。电子的受力方向相反。</p>`;
    $('#potential-panel').innerHTML=header+content+`<div class="potential-next"><span>${step+1} / 4</span>${step<3?`<button class="primary" id="potential-next">下一步：${stages[step+1].title} →</button>`:'<button id="potential-restart">回到电势定义</button>'}</div>`;
    $('#potential-next')?.addEventListener('click',()=>go(step+1));$('#potential-restart')?.addEventListener('click',()=>go(0));
    $('#potential-distance')?.addEventListener('input',e=>{radiusA=Number(e.target.value);$('#potential-distance-value').textContent=`${radiusA.toFixed(2)} mm`;renderModel();});
    $('#slice-offset')?.addEventListener('input',e=>{offset=Number(e.target.value);$('#slice-offset-value').textContent=`${offset.toFixed(2)} mm`;if(step===1)uv=[Math.sqrt(Math.max(0,shellRadius**2-offset**2)),0];renderModel();});
    $('#align-slice')?.addEventListener('click',()=>scene.view('front'));
    $('#zero-plane')?.addEventListener('click',()=>{offset=0;$('#slice-offset').value=0;$('#slice-offset-value').textContent='0.00 mm';renderModel();scene.view('iso');});
    container.querySelectorAll('[data-reference]').forEach(b=>b.onclick=()=>{reference=b.dataset.reference;container.querySelectorAll('[data-reference]').forEach(x=>x.classList.toggle('active',x===b));renderModel();});
    container.querySelectorAll('[data-shell]').forEach(b=>b.onclick=()=>{shellRadius=Number(b.dataset.shell);offset=0;uv=[shellRadius,0];renderPanel();renderModel();});
    const plot=$('#slice-plot');if(plot){plot.onclick=e=>{const r=plot.getBoundingClientRect();uv=[(e.clientX-r.left)/r.width*9-4.5,4.5-(e.clientY-r.top)/r.height*9];renderModel();};plot.onkeydown=e=>{const d={ArrowLeft:[-.1,0],ArrowRight:[.1,0],ArrowUp:[0,.1],ArrowDown:[0,-.1]}[e.key];if(d){e.preventDefault();uv=uv.map((v,i)=>Math.max(-4.4,Math.min(4.4,v+d[i])));renderModel();}};}
  }
  function renderReadings(){
    const p=pointA(),f=fieldAt(p,sources()),a=volts(p),b=volts(pointB),difference=a-b;
    $('#potential-a')&&($('#potential-a').textContent=formatV(a)+(step===3?' V':''));$('#potential-b')&&($('#potential-b').textContent=formatV(b));$('#potential-difference')&&($('#potential-difference').textContent=`${formatV(difference)} V`);
    $('#potential-reference-badge').innerHTML=`零点约定：<strong>${step===2&&reference==='B'?'B 点为 0 V':'无限远处为 0 V'}</strong>`;
    if(step===0){$('#potential-observation').textContent=`A 处 ${formatV(a)} V，B 处 ${formatV(b)} V。把 A 移近这个正电荷，A 的电势升高。`;$('#potential-scene-note').innerHTML='<strong>先认两个位置</strong><br>金色 A：可以移动<br>灰蓝 B：固定用来比较';$('#potential-formula').textContent='V = U / q';$('#potential-formula-caption').textContent='同一参考零点下：电势 = 电势能 ÷ 电荷量';$('#potential-formula-note').innerHTML=`<strong>读数描述位置，不表示这里已经放了一个电荷。</strong><p>先选择电势能的参考零点，再给每个位置一个 V 值。若把电荷 q 放在 A，其电势能为 U<sub>A</sub> = qV<sub>A</sub>。图中的 A 比 B 高 ${formatV(difference)} V。</p>`;}
    if(step===1){const shellV=fieldAt([shellRadius,0,0],single).V,cross=Math.abs(offset)<=shellRadius;$('#surface-voltage').textContent=`${formatV(shellV)} V`;$('#slice-label').textContent=`z = ${offset.toFixed(2)} mm`;$('#slice-result').innerHTML=cross?`<span>球面还是原来的球面</span><strong>${Math.abs(offset-shellRadius)<1e-8?'圆缩成了一个点':offset>.01?'截出来的圆变小了':'截出来的圆最大'}</strong><small>绿色圆上处处 ${formatV(shellV)} V；选中 A：${formatV(a)} V。</small>`:'<span>切片已经错过这层球面</span><strong>圆消失了，球面还在</strong><small>拖回切片，就能再次看见交线。</small>';$('#potential-scene-note').innerHTML=`<strong>透明球面：${formatV(shellV)} V</strong><br>整个球面的半径 ${shellRadius.toFixed(1)} mm<br>绿色圆是薄片与球面的交线`;$('#potential-formula').textContent='V = kQ / r';$('#potential-formula-caption').textContent='本例球外，取无限远为零；r 是到源中心的距离';$('#potential-formula-note').innerHTML=`<strong>为什么是球面？</strong><p>源电荷 Q 固定时，距离 r 相同，电势就相同。图上整层球面距源 ${shellRadius.toFixed(1)} mm，所以整层都是 ${formatV(shellV)} V。切片移动只改变我们看到的交线，不改变源电荷或这层球面。</p>`;}
    if(step===2){$('#potential-field').textContent=`${vectorLength(f.E).toFixed(1)} V/m`;$('#potential-scene-note').innerHTML=`<strong>当前记法</strong><br>A：${formatV(a)} V<br>B：${formatV(b)} V<br>箭头大小、方向保持不变`;$('#potential-formula').textContent='V′ = V − V(B)';$('#potential-formula-caption').textContent='把 B 记为零：每个位置都减去同一个常数';$('#potential-formula-note').innerHTML=`<strong>“零电势”需要说明零点选在哪里。</strong><p>这里统一减去 ${formatV(fieldAt(pointB,single).V)} V。A 与 B 的差仍为 ${formatV(difference)} V，空间中的电势变化率也不变，所以电场不变。若改了参考零点，原来叫“零电势面”的那一层不一定还叫零。</p>`;}
    if(step===3){const plus=fieldAt(p,[pair[0]]).V,minus=fieldAt(p,[pair[1]]).V;$('#positive-v').textContent=`+${plus.toFixed(3)} V`;$('#negative-v').textContent=`${minus.toFixed(3)} V`;$('#potential-field').textContent=Math.abs(f.E[1]).toFixed(1);$('#potential-inplane').textContent=Math.hypot(f.E[0],f.E[2]).toFixed(1);$('#potential-observation').innerHTML=Math.abs(offset)<.001?'<span>在正中间</span><strong>电势相消，电场仍穿过薄片</strong><small>两个电场都指向负电荷一侧。只看薄片内部，会漏掉穿过它的方向。</small>':'<span>薄片已经离开中间</span><strong>距离不再相等，电势不再相消</strong><small>回到正中间，再比较电势与电场。</small>';$('#potential-scene-note').innerHTML=`<strong>A 处的读数</strong><br>V = ${formatV(a)} V<br>完整电场 |E| = ${vectorLength(f.E).toFixed(1)} V/m<br>绿色箭头：完整电场方向`;$('#potential-formula').textContent='V = V₊ + V₋';$('#potential-formula-caption').textContent='电势是带正负号的数，直接相加';$('#potential-formula-note').innerHTML='<strong>电势为零，不等于电场为零。</strong><p>取无限远为零，等量正负源的中间平面恰好 V = 0。电场看的是邻近位置电势如何变化：沿薄片内移动，V 不变；穿过薄片移动，V 会变。因而面内电场为零时，穿过薄片的电场仍可存在。</p>';}
  }
  function drawPlot(){
    const canvas=$('#slice-plot');if(!canvas)return;const ctx=canvas.getContext('2d'),N=360,scale=40;
    ctx.fillStyle='#edf5f5';ctx.fillRect(0,0,N,N);ctx.strokeStyle='#cfdfdf';ctx.lineWidth=1;
    for(let i=20;i<360;i+=40){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,N);ctx.moveTo(0,i);ctx.lineTo(N,i);ctx.stroke();}
    ctx.strokeStyle='#9ab7bc';ctx.beginPath();ctx.moveTo(0,180);ctx.lineTo(360,180);ctx.moveTo(180,0);ctx.lineTo(180,360);ctx.stroke();
    if(Math.abs(offset)<=shellRadius){const r=Math.sqrt(Math.max(0,shellRadius**2-offset**2))*scale;ctx.beginPath();ctx.arc(180,180,r,0,Math.PI*2);ctx.fillStyle='#087e8b0a';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#087e8b';ctx.stroke();if(r>28){const label=`${formatV(fieldAt([shellRadius,0,0],single).V)} V`;ctx.font='600 13px sans-serif';const w=ctx.measureText(label).width;ctx.fillStyle='#f7fbfa';ctx.fillRect(180-w/2-7,180-r-10,w+14,20);ctx.fillStyle='#087e8b';ctx.fillText(label,180-w/2,184-r);}}
    // A source is only drawn when the plane actually intersects its sphere.
    if(Math.abs(offset)<=single[0].radius){ctx.beginPath();ctx.arc(180,180,Math.max(3,Math.sqrt(single[0].radius**2-offset**2)*scale),0,Math.PI*2);ctx.fillStyle='#d75f4f';ctx.fill();}
    const x=180+uv[0]*scale,y=180-uv[1]*scale;ctx.beginPath();ctx.arc(x,y,5.5,0,Math.PI*2);ctx.fillStyle='#ecab46';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#926b27';ctx.stroke();ctx.font='600 12px sans-serif';ctx.fillStyle='#6d551b';ctx.fillText('A',Math.min(x+9,344),Math.max(y-8,14));ctx.font='11px sans-serif';ctx.fillStyle='#527985';ctx.fillText('x / mm',305,174);ctx.fillText('y / mm',187,16);ctx.fillStyle='#5f7e87';ctx.fillText(`只取 z = ${offset.toFixed(2)} mm 这一层`,12,343);
  }
  function go(next){
    step=next;reference='infinity';offset=0;if(step===1)uv=[shellRadius,0];if(step===2)radiusA=2;if(step===3)uv=[1.5,0];
    container.querySelectorAll('[data-potential-step]').forEach(b=>{const active=Number(b.dataset.potentialStep)===step;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    $('.scene-label strong').textContent=stages[step].question;$('.hint-chip').textContent=stages[step].hint;
    $('.legend').innerHTML=step===3?'<span><i style="background:#d75f4f"></i>正电荷</span><span><i style="background:#3689b2"></i>负电荷</span><span><i style="background:#ecab46"></i>观察点 A</span>':'<span><i style="background:#d75f4f"></i>固定正电荷</span><span><i style="background:#ecab46"></i>观察点 A</span>';
    renderPanel();renderModel();scene.view('iso');
  }
  container.querySelectorAll('[data-potential-step]').forEach(b=>b.onclick=()=>go(Number(b.dataset.potentialStep)));
  scene.onPick((p,obj)=>{if(obj?.userData.source||!(step===1||step===3)||!p.every(Number.isFinite))return;const v=step===3?p[2]:p[1];if(Math.abs(p[0])<=4.5&&Math.abs(v)<=4.5){uv=[p[0],v];renderModel();}});
  go(0);return()=>scene.dispose();
}



