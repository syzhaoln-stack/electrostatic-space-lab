import {FieldScene, THREE, stageChrome, bindViews, slider} from './scene.js';
import {fieldAt} from './physics.js';
import {createPotentialMotion,motionMarkup} from './potential-motion.js';

// Every reading uses the same 3D sphere solution. A reference change subtracts
// one constant everywhere, and never modifies the electric field.
export function mountSlice(container) {
  if (!document.querySelector('link[data-potential-style]')) {
    const sheet=document.createElement('link');sheet.rel='stylesheet';
    sheet.href=new URL('./slice.css',import.meta.url).href;sheet.dataset.potentialStyle='';document.head.append(sheet);
  }
  const stages=[
    {title:'移动电荷，看功',question:'A → B：能量去了哪里？',hint:'线与箭头仅示方向 · 光点不是真实粒子'},
    {title:'沿等势面移动',question:'力朝外，沿球面移动会怎样？',hint:'橙色 F 朝外 · 青色移动沿面 · 90°'},
    {title:'零点可以换',question:'换零点，会把电场一起换掉吗？',hint:'切换右侧的零点约定，观察数值和箭头'},
    {title:'零电势仍有场',question:'读数为零，为什么仍有电场？',hint:'移动中间薄片，看两个电荷的电势怎样相加'}
  ];
  container.innerHTML=`<section class="potential-lab"><nav class="potential-steps" aria-label="电势学习步骤">${stages.map((s,i)=>`<button data-potential-step="${i}" ${i===0?'class="active" aria-current="step"':''}><span>0${i+1}</span>${s.title}</button>`).join('')}</nav><div class="lab-layout"><div class="stage-wrap"><div class="stage"></div>${stageChrome(stages[0].question,stages[0].hint)}<div class="probe-detail" id="potential-scene-note"></div><div class="potential-reference-badge" id="potential-reference-badge"></div></div><aside class="panel" id="potential-panel"></aside></div><div class="formula-strip potential-formula"><div><div class="formula" id="potential-formula"></div><div class="formula-caption" id="potential-formula-caption"></div></div><div class="formula-note" id="potential-formula-note"></div></div><div class="learn-row"><details class="learning"><summary>模型是什么？这些球面是真实物体吗？</summary><p>红、蓝小球是固定、均匀带电的绝缘实心球，半径 0.22 mm，电荷量为 ±0.30 pC。球外的场与同位置点电荷相同。透明球面、切片和箭头是计算结果的可视化，不是物体，也不会挡住电场。观察点不加入会影响源电荷的真实电荷。</p></details><details class="learning"><summary>电势和电势能，怎样区分？</summary><p>电势 V 描述位置；电势能 U 还取决于放入的电荷 q。选定同一零点后，U = qV；两点之间 ΔU = qΔV。正电荷移向较高电势，电势能增加；电子带负电，变化方向相反。这里的能量均指电势能，不能当作动能。</p><p>例如，电势差为 +1 V 时，带电量为 +e 的虚拟试探粒子，电势能增加 1 eV；电子则减少 1 eV。e 是一个基本电荷量，eV 是能量单位。实际运动还要结合初始速度和受力。</p></details></div></section>`;
  const $=selector=>container.querySelector(selector);
  const scene=new FieldScene($('.stage'),{extent:6});bindViews(container,scene);scene.view('iso');
  let step=0,radiusA=2,shellRadius=2.4,offset=0,uv=[2.4,0],reference='infinity',surfaceMode='move';
  const motion=createPotentialMotion(scene,container);scene.frameFn=t=>motion.tick(t);
  const pointB=[4,0,0];
  const single=[{pos:[0,0,0],Q:.3,radius:.22,label:'Q'}];
  const pair=[{pos:[0,2.4,0],Q:.3,radius:.22,label:'+Q'},{pos:[0,-2.4,0],Q:-.3,radius:.22,label:'−Q'}];
  const sources=()=>step===3?pair:single;
  const pointA=()=>step===1?[uv[0],uv[1],offset]:step===3?[uv[0],offset,uv[1]]:[radiusA,0,0];
  const refValue=()=>step===2&&reference==='B'?fieldAt(pointB,single).V:0;
  const volts=p=>fieldAt(p,sources()).V-refValue();
  const formatV=v=>(Math.abs(v)<.0005?'0.000':v.toFixed(3));
  const vectorLength=v=>Math.hypot(...v);
  function spaceLabel(text,pos,color='#cee8f1',layer='measurements',height=.36){const c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.font='500 34px "Microsoft YaHei",sans-serif';c.width=Math.ceil(ctx.measureText(text).width+18);c.height=56;ctx.font='500 34px "Microsoft YaHei",sans-serif';ctx.fillStyle='#07111dd9';ctx.fillRect(0,0,c.width,56);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,28);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,fog:false,toneMapped:false}));sprite.position.set(...pos);sprite.scale.set(height*c.width/56,height,1);scene.layer(layer).add(sprite);return sprite;}
  const planePoint=(u,v)=>step===3?[u,offset,v]:[u,v,offset];
  function point(p,color,caption,layer='measurements',size=.11){const m=new THREE.Mesh(new THREE.SphereGeometry(size,20,16),new THREE.MeshStandardMaterial({color,roughness:.3}));m.position.set(...p);scene.layer(layer).add(m);spaceLabel(caption,[p[0],p[1]+.43,p[2]],color,layer,.38);}
  function dash(points,color,layer='measurements'){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const line=new THREE.Line(geo,new THREE.LineDashedMaterial({color,dashSize:.12,gapSize:.09,transparent:true,opacity:.72}));line.computeLineDistances();scene.layer(layer).add(line);}
  function ring(r,z,color,layer='surface',axis='z'){const points=Array.from({length:97},(_,i)=>{const a=i/96*Math.PI*2;return axis==='z'?[r*Math.cos(a),r*Math.sin(a),z]:axis==='y'?[r*Math.cos(a),z,r*Math.sin(a)]:[z,r*Math.cos(a),r*Math.sin(a)]});return scene.line(points,color,layer,.82);}
  function selectedSurface(){
    scene.layer('surface').add(new THREE.Mesh(new THREE.SphereGeometry(shellRadius,64,40),new THREE.MeshBasicMaterial({color:'#35afbc',transparent:true,opacity:.075,side:THREE.DoubleSide,depthWrite:false})));
    for(const axis of ['x','y','z'])ring(shellRadius,0,'#55bfc4','surface',axis);
    const s=shellRadius/Math.sqrt(2);[[-s,s,0],[-s,0,-s]].forEach(p=>point(p,'#74dfd2',`${formatV(volts(p))} V`,'surface',.065));
    if(Math.abs(offset)<shellRadius){const r=Math.sqrt(shellRadius**2-offset**2),points=Array.from({length:64},(_,i)=>new THREE.Vector3(r*Math.cos(i/64*Math.PI*2),r*Math.sin(i/64*Math.PI*2),offset));const curve=new THREE.CatmullRomCurve3(points,true);scene.layer('intersection').add(new THREE.Mesh(new THREE.TubeGeometry(curve,128,.018,6,true),new THREE.MeshBasicMaterial({color:'#6ce5d5'})));}
  }
  function referenceSurface(){
    // Keep this geometric surface fixed while its displayed voltage changes.
    const r=4;scene.layer('surface').add(new THREE.Mesh(new THREE.SphereGeometry(r,48,32),new THREE.MeshBasicMaterial({color:'#35afbc',transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false})));
    for(const axis of ['x','z'])ring(r,0,'#4b8c9d','surface',axis);
    const p=[-r/Math.sqrt(2),r/Math.sqrt(2),0];point(p,'#6ce5d5',`同一层：${formatV(volts(p))} V`,'surface',.065);
  }
  function plane(){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(9,9),new THREE.MeshBasicMaterial({color:'#3c889e',transparent:true,opacity:.10,side:THREE.DoubleSide,depthWrite:false}));if(step===3){mesh.rotation.x=-Math.PI/2;mesh.position.y=offset;}else mesh.position.z=offset;scene.layer('slice').add(mesh);scene.line([planePoint(-4.5,-4.5),planePoint(4.5,-4.5),planePoint(4.5,4.5),planePoint(-4.5,4.5),planePoint(-4.5,-4.5)],'#5faabe','slice',.7);scene.pickPlane.set(new THREE.Vector3(...(step===3?[0,1,0]:[0,0,1])),-offset);if(step===3)spaceLabel(`这张切片：y = ${offset.toFixed(2)} mm`,planePoint(-.3,-4.3),'#a5d9e6','slice',.28);}
  function renderSceneChrome(){
    const cut=step===1&&surfaceMode==='slice';
    $('.scene-label strong').textContent=cut?'一张切片，怎样变成教材图？':stages[step].question;
    $('.hint-chip').textContent=cut?'青色交线：同一等势面的截线':stages[step].hint;
    $('.legend').innerHTML=cut?'<span><i style="background:#ff8e79"></i>固定源 Q</span><span><i style="background:#6ce5d5"></i>等势面交线</span><span><i style="background:#ecab46"></i>观察点 A</span>':step===3?'<span><i style="background:#ff8e79"></i>正电荷</span><span><i style="background:#80c6f6"></i>负电荷</span><span><i style="background:#ecab46"></i>观察点 A</span>':step<2?'<span><i style="background:#ff8e79"></i>固定源 Q</span><span><i style="background:#ecab46"></i>移动 +q</span><span><i style="background:#c96e38"></i>电场力 F</span>':'<span><i style="background:#ff8e79"></i>固定正电荷</span><span><i style="background:#ecab46"></i>观察点 A</span>';
  }
  function renderModel(){
    renderSceneChrome();
    for(const name of ['charges','measurements','surface','intersection','slice','potential-vectors'])scene.clearLayer(name);
    sources().forEach(s=>scene.charge(s));const p=pointA(),f=fieldAt(p,sources());
    if(step===1){selectedSurface();if(surfaceMode==='slice')plane();else point([0,shellRadius,0],'#b5cedc','B');}if(step===2)referenceSurface();if(step===3)plane();
    if(step===0||step===2){dash([[0,0,0],pointB],'#667d90');point(pointB,'#b5cedc','B');if(step===2)spaceLabel(`A 距源 ${radiusA.toFixed(2)} mm`,[radiusA/2,-.55,0],'#93a9b8','measurements',.40);}
    point(p,'#ffd17a','A');
    if(step===2||step===3){scene.arrow(p,f.E,'#6ce5d5',1.35,'potential-vectors');const direction=new THREE.Vector3(...f.E).normalize().multiplyScalar(1.5).add(new THREE.Vector3(...p));spaceLabel('E 的方向',direction.toArray(),'#6ce5d5','potential-vectors',.43);}
    if(step===3)pair.forEach((s,i)=>{dash([s.pos,p],i?'#80c6f6':'#ff8e79');const m=s.pos.map((x,j)=>(x+p[j])/2);spaceLabel(`距${i?'负':'正'}电荷 ${vectorLength(p.map((x,j)=>x-s.pos[j])).toFixed(2)} mm`,m,i?'#80c6f6':'#f5ac98','measurements',.39);});
    renderReadings();drawPlot();motion.configure({enabled:step===0||(step===1&&surfaceMode==='move'),field:step===0||step===2||(step===1&&surfaceMode==='move'),mode:step===1?'surface':'radial',radiusA,radius:shellRadius});
  }
  function renderPanel(){
    const header=`<div class="eyebrow">${step+1} / 4 · 一次弄清一件事</div><h2>${stages[step].title}</h2>`;let content='';
    if(step===0)content=`<p class="potential-definition">金色的<strong>正试探电荷</strong>从 A 走到 B。橙色箭头是电场力，空间里淡青色的线指向外侧。</p><div class="potential-endpoints"><span>A：<strong id="potential-a"></strong> V</span><b>→</b><span>B：<strong id="potential-b"></strong> V</span></div>${motionMarkup('radial')}<details class="potential-extra"><summary>这与“电势”有什么关系？</summary><p>电势 V 是某位置的电势能 U 除以放入的电荷量 q：<strong>V = U/q</strong>。先约定无限远为零，再比较 A、B。这个正电荷向较低电势移动，电势能减少，电场做正功。</p><p>这里 q = +e，是一个基本电荷量；eV 是能量单位。+e 跨过 1 V 电势差，对应 1 eV 的电势能变化。该功不必全部变成动能，因为演示由外力控制移动。当前受力大小：<span id="potential-force-value"></span>。</p></details><details class="potential-extra"><summary>改变起点 A，再比较</summary>${slider('potential-distance','A 离源电荷多远',.8,3.6,.02,radiusA,'mm')}<p>A 与 B 的电势差：<strong id="potential-difference"></strong></p></details>`;
    if(step===1){
      content=`<p class="potential-definition">这一球面上的电势都相同：<strong id="surface-voltage"></strong>。它叫作<strong>等势面</strong>。</p><div class="potential-mode-tabs"><button data-surface-mode="move" class="${surfaceMode==='move'?'active':''}">沿面移动</button><button data-surface-mode="slice" class="${surfaceMode==='slice'?'active':''}">取一张切片</button></div>`;
      content+=surfaceMode==='move'?`<p>先让电荷走过四分之一圈，比较力与移动方向。</p>${motionMarkup('surface')}<div class="potential-small-callout">小平面与球面在此处相切。电场 E 和正电荷受力 F 沿法线，均垂直于这个局部切平面。</div>`:`<p>薄片只改变观察。绿色交线上的电势与原球面相同。</p>${slider('slice-offset','把切片移出球心',0,3.6,.02,offset,'mm')}<div class="plot-label"><span id="slice-label"></span><span>同一张切片 ↓</span></div><canvas id="slice-plot" class="mini-canvas" width="360" height="360" tabindex="0" aria-label="电势球面的截面图。点击选择观察点，方向键微调。"></canvas><div class="potential-plot-key"><i></i>绿色圆：同一等势面的截线</div><div class="potential-result" id="slice-result"></div><button id="align-slice" class="potential-wide">正对切片，看教材图</button>`;
      content+=`<details class="potential-extra"><summary>换一层球面</summary><div class="potential-radius-options">${[1.4,2.4,3.4].map(r=>`<button data-shell="${r}" ${r===shellRadius?'class="active"':''}>${r} mm</button>`).join('')}</div></details>`;
    }
    if(step===2)content=`<p class="potential-definition">电势的<strong>零点由我们选定</strong>。把 B 改记为 0，所有位置的电势一起减去同一个数。经过 B 的透明球面还在原处，整层的读数一起改变。</p><div class="potential-reference-options"><button id="reference-infinity" data-reference="infinity" class="${reference==='infinity'?'active':''}"><span>约定一</span><strong>无限远为 0</strong><small>A：${formatV(fieldAt(pointA(),single).V)} V<br>B：${formatV(fieldAt(pointB,single).V)} V</small></button><button id="reference-b" data-reference="B" class="${reference==='B'?'active':''}"><span>约定二</span><strong>B 点为 0</strong><small>A：${formatV(fieldAt(pointA(),single).V-fieldAt(pointB,single).V)} V<br>B：0.000 V</small></button></div><div class="potential-result"><span>换零点后，以下两项不变</span><div class="potential-invariants"><div><small>A 与 B 的电势差</small><strong id="potential-difference"></strong></div><div><small>A 处的电场大小</small><strong id="potential-field"></strong></div></div></div><p class="potential-observation">箭头仍指向同一方向。<strong>“0 V”是相对于选定零点的读数，不能据此说没有电场。</strong></p>`;
    if(step===3)content=`<p class="potential-definition">正负电荷等量、位置对称，仍约定<strong>无限远为 0</strong>。在中间平面，每一点到两源距离相等。</p><div class="potential-sum" aria-label="两个电荷的电势贡献"><span class="positive">正电荷贡献<strong id="positive-v"></strong></span><b>＋</b><span class="negative">负电荷贡献<strong id="negative-v"></strong></span><b>＝</b><span>这里的电势<strong id="potential-a"></strong></span></div>${slider('slice-offset','让薄片离开中间位置',-.9,.9,.02,offset,'mm')}<button id="zero-plane" class="potential-wide">回到正中间</button><div class="readouts"><div class="readout"><span>穿过薄片的电场</span><strong id="potential-field"></strong><small>V/m</small></div><div class="readout"><span>薄片内的电场</span><strong id="potential-inplane"></strong><small>V/m</small></div></div><div class="potential-result" id="potential-observation"></div><p class="small">箭头表示电场方向，即正试探电荷受力的方向。电子的受力方向相反。</p>`;
    $('#potential-panel').innerHTML=header+content+`<div class="potential-next"><span>${step+1} / 4</span>${step<3?`<button class="primary" id="potential-next">下一步：${stages[step+1].title} →</button>`:'<button id="potential-restart">回到电势定义</button>'}</div>`;
    $('#potential-next')?.addEventListener('click',()=>go(step+1));$('#potential-restart')?.addEventListener('click',()=>go(0));
    motion.bind();container.querySelectorAll('[data-surface-mode]').forEach(b=>b.onclick=()=>{surfaceMode=b.dataset.surfaceMode;offset=0;uv=[shellRadius,0];renderPanel();renderModel();});
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
    if(step===0){$('#potential-formula').textContent='W = q(VA − VB)';$('#potential-formula-caption').textContent='电场做功 W = 电势能的减少量 −ΔU';$('#potential-formula-note').innerHTML=`<strong>把两个位置的读数，变成可见的能量变化。</strong><p>本次 A 为 ${formatV(a)} V，B 为 ${formatV(b)} V。+e 从 A 到 B，电场做功 ${formatV(difference)} eV，电势能减少同样的数值。中途每一点也按同一公式更新。改变起点，可以改变这笔能量差。</p>`;}
    if(step===1){
      const shellV=fieldAt([shellRadius,0,0],single).V,cross=Math.abs(offset)<=shellRadius;$('#surface-voltage').textContent=`${formatV(shellV)} V`;
      if(surfaceMode==='slice'){
        $('#slice-label').textContent=`z = ${offset.toFixed(2)} mm`;$('#slice-result').innerHTML=cross?`<span>球面还是原来的球面</span><strong>${Math.abs(offset-shellRadius)<1e-8?'圆缩成了一个点':offset>.01?'截出来的圆变小了':'截出来的圆最大'}</strong><small>交线上 ${formatV(shellV)} V；选中 A：${formatV(a)} V。</small>`:'<span>切片已经错过这层球面</span><strong>圆消失了，球面还在</strong><small>拖回切片，就能再次看见交线。</small>';
        $('#potential-scene-note').innerHTML=`<strong>球面：${formatV(shellV)} V</strong><br>半径 ${shellRadius.toFixed(1)} mm<br>绿色圆是同一球面的截线`;
      }
      $('#potential-formula').textContent=surfaceMode==='move'?'ΔV = 0 ⇒ W = 0':'V = kQ / r';
      $('#potential-formula-caption').textContent=surfaceMode==='move'?'沿等势面，电势不变，电场不做功':'本例球外，取无限远为零；r 是到源中心的距离';
      $('#potential-formula-note').innerHTML=surfaceMode==='move'?`<strong>不是没有力，而是力没有沿路径的分量。</strong><p>图中的 F 沿球面法线，局部移动方向沿切线，两者夹角为 90°。走完整段，起点与终点都是 ${formatV(shellV)} V，因此电场做功为零。外力负责让试探电荷沿这条弧线走，不应把它当作自由轨迹。</p>`:`<strong>为什么是球面？</strong><p>Q 固定时，到源中心距离 r 相同，电势就相同。整个半径 ${shellRadius.toFixed(1)} mm 的球面都是 ${formatV(shellV)} V。移动切片只改变交线，不改变电场。</p>`;
    }
    if(step===2){$('#potential-field').textContent=`${vectorLength(f.E).toFixed(1)} V/m`;$('#potential-scene-note').innerHTML=`<strong>当前记法</strong><br>A：${formatV(a)} V<br>B：${formatV(b)} V<br>E 不变`;$('#potential-formula').textContent='V′ = V − V(B)';$('#potential-formula-caption').textContent='把 B 记为零：每个位置都减去同一个常数';$('#potential-formula-note').innerHTML=`<strong>“零电势”需要说明零点选在哪里。</strong><p>这里统一减去 ${formatV(fieldAt(pointB,single).V)} V。A 与 B 的差仍为 ${formatV(difference)} V，空间中的电势变化率也不变，所以电场不变。若改了参考零点，原来叫“零电势面”的那一层不一定还叫零。</p>`;}
    if(step===3){const plus=fieldAt(p,[pair[0]]).V,minus=fieldAt(p,[pair[1]]).V;$('#positive-v').textContent=`+${plus.toFixed(3)} V`;$('#negative-v').textContent=`${minus.toFixed(3)} V`;$('#potential-field').textContent=Math.abs(f.E[1]).toFixed(1);$('#potential-inplane').textContent=Math.hypot(f.E[0],f.E[2]).toFixed(1);$('#potential-observation').innerHTML=Math.abs(offset)<.001?'<span>在正中间</span><strong>电势相消，电场仍穿过薄片</strong><small>两个电场都指向负电荷一侧。只看薄片内部，会漏掉穿过它的方向。</small>':'<span>薄片已经离开中间</span><strong>距离不再相等，电势不再相消</strong><small>回到正中间，再比较电势与电场。</small>';$('#potential-scene-note').innerHTML=`<strong>A 点</strong><br>V = ${formatV(a)} V<br>完整电场 |E| = ${vectorLength(f.E).toFixed(1)} V/m<br>`;$('#potential-formula').textContent='V = V₊ + V₋';$('#potential-formula-caption').textContent='电势是带正负号的数，直接相加';$('#potential-formula-note').innerHTML='<strong>电势为零，不等于电场为零。</strong><p>取无限远为零，等量正负源的中间平面恰好 V = 0。电场看的是邻近位置电势如何变化：沿薄片内移动，V 不变；穿过薄片移动，V 会变。因而面内电场为零时，穿过薄片的电场仍可存在。</p>';}
  }
  function drawPlot(){
    const canvas=$('#slice-plot');if(!canvas)return;const ctx=canvas.getContext('2d'),N=360,scale=40;
    ctx.fillStyle='#091725';ctx.fillRect(0,0,N,N);ctx.strokeStyle='#172f42';ctx.lineWidth=1;
    for(let i=20;i<360;i+=40){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,N);ctx.moveTo(0,i);ctx.lineTo(N,i);ctx.stroke();}
    ctx.strokeStyle='#35556a';ctx.beginPath();ctx.moveTo(0,180);ctx.lineTo(360,180);ctx.moveTo(180,0);ctx.lineTo(180,360);ctx.stroke();
    if(Math.abs(offset)<=shellRadius){const r=Math.sqrt(Math.max(0,shellRadius**2-offset**2))*scale;ctx.beginPath();ctx.arc(180,180,r,0,Math.PI*2);ctx.fillStyle='#6ce5d50a';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#6ce5d5';ctx.stroke();if(r>28){const label=`${formatV(fieldAt([shellRadius,0,0],single).V)} V`;ctx.font='600 13px sans-serif';const w=ctx.measureText(label).width;ctx.fillStyle='#0b2232';ctx.fillRect(180-w/2-7,180-r-10,w+14,20);ctx.fillStyle='#6ce5d5';ctx.fillText(label,180-w/2,184-r);}}
    // A source is only drawn when the plane actually intersects its sphere.
    if(Math.abs(offset)<=single[0].radius){ctx.beginPath();ctx.arc(180,180,Math.max(3,Math.sqrt(single[0].radius**2-offset**2)*scale),0,Math.PI*2);ctx.fillStyle='#ff8e79';ctx.fill();}
    const x=180+uv[0]*scale,y=180-uv[1]*scale;ctx.beginPath();ctx.arc(x,y,5.5,0,Math.PI*2);ctx.fillStyle='#ecab46';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#f2cc7f';ctx.stroke();ctx.font='600 12px sans-serif';ctx.fillStyle='#ffdb91';ctx.fillText('A',Math.min(x+9,344),Math.max(y-8,14));ctx.font='11px sans-serif';ctx.fillStyle='#87afc4';ctx.fillText('x / mm',305,174);ctx.fillText('y / mm',187,16);ctx.fillStyle='#8faabc';ctx.fillText(`只取 z = ${offset.toFixed(2)} mm 这一层`,12,343);
  }
  function go(next){
    step=next;reference='infinity';offset=0;if(step===1){uv=[shellRadius,0];surfaceMode='move';}if(step===2)radiusA=2;if(step===3)uv=[1.5,0];
    container.querySelectorAll('[data-potential-step]').forEach(b=>{const active=Number(b.dataset.potentialStep)===step;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    renderPanel();renderModel();scene.view('iso');
  }
  container.querySelectorAll('[data-potential-step]').forEach(b=>b.onclick=()=>go(Number(b.dataset.potentialStep)));
  scene.onPick((p,obj)=>{if(obj?.userData.source||!(step===1&&surfaceMode==='slice'||step===3)||!p.every(Number.isFinite))return;const v=step===3?p[2]:p[1];if(Math.abs(p[0])<=4.5&&Math.abs(v)<=4.5){uv=[p[0],v];renderModel();}});
  go(0);return()=>scene.dispose();
}
