import * as THREE from 'three';
import { FieldScene } from './scene.js';
import { RADIATION, drivenSource, radiationAt, radiationPeak } from './propagation-physics.js';

const METRES_PER_UNIT = 10, SOURCE_MAGNIFICATION = 350, END_NS = 400;
const norm = vector => Math.hypot(...vector);
const fmt = (value, digits = 1) => (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits);

export function mountPropagation(host) {
  if (!document.querySelector('link[data-propagation-style]')) {
    const sheet = document.createElement('link'); sheet.rel = 'stylesheet'; sheet.href = new URL('./propagation.css', import.meta.url).href; sheet.dataset.propagationStyle = ''; document.head.append(sheet);
  }
  host.innerHTML = `<section class="propagation-lab">
    <div class="prop-toolbar"><span>振荡电荷</span><div><button id="prop-play">暂停</button><button id="prop-restart">重播</button><button id="prop-params-toggle" aria-expanded="false" aria-controls="prop-parameters">参数与解释</button></div></div>
    <div class="prop-stage-wrap"><div class="prop-stage"></div><div class="prop-stage-bottom">远区辐射模型 · 距源 20 m 内不显示 · 源振幅放大 350 倍</div></div>
    <div id="prop-parameters" class="prop-parameters" hidden>
      <p class="prop-model-intro">先看箭头原地起伏，再比较远近两个位置的延迟。这里只显示低速、远区的辐射项，不是完整电磁场。</p>
      <div class="prop-parameter-grid"><div class="prop-panel">
        <div class="prop-views"><button data-prop-view="space" class="active">XZ 空间</button><button data-prop-view="front">XY 二维切面</button></div>
        <div class="prop-control"><label for="prop-frequency">振动频率 <output id="prop-frequency-value">45 MHz</output></label><input id="prop-frequency" type="range" min="30" max="90" step="5" value="45"><small>改频率会重新开始；传播速度始终为 c。</small></div>
        <div class="prop-control"><label for="prop-time">回看时刻 <output id="prop-time-value">260.0 ns</output></label><input id="prop-time" type="range" min="0" max="400" step="0.5" value="260"><small>拖动即暂停。动画 1 秒对应 30 ns。</small></div>
        <button id="prop-focus-a" class="prop-focus-button">暂停，近看 A 点</button><label class="prop-check" id="prop-b-control" hidden><input type="checkbox" id="prop-show-b"> 再加上磁场 B</label><p id="prop-triad-note" class="prop-small">箭头根部不移动，表示该位置电场的方向与强弱。</p>
      </div><div class="prop-panel">
        <div class="prop-probe" data-prop-probe="a"><div><strong>A · 距源 30 m</strong><span id="prop-a-delay"></span></div><p id="prop-a-reading"></p></div>
        <div class="prop-probe" data-prop-probe="b"><div><strong>B · 距源 60 m</strong><span id="prop-b-delay"></span></div><p id="prop-b-reading"></p></div>
        <div class="prop-delay"><span>同一次变化</span><strong>B 比 A 晚 <b id="prop-delay-value">100.1</b> ns</strong><small>距离差 ÷ 光速，和频率无关。</small></div><p id="prop-scene-message" class="prop-small"></p>
      </div></div>
    <div class="prop-chart-card"><div class="prop-chart-title"><strong>两个位置，收到的是不同时刻的变化。</strong><span>同一纵轴：E<sub>y</sub> / mV·m⁻¹</span></div><canvas id="prop-history" height="180" aria-label="两个探针的辐射电场随时间变化，B的波形比A滞后且幅值更小"></canvas><p>青色是 A，橙色是 B。竖虚线分别标启动扰动的首次到达时刻；远处接收到同一次变化更晚，远区辐射幅值也随距离减小。</p></div>
    <div class="prop-lesson"><p><strong>从哪里来的延迟？</strong>距离为 r 的位置，此刻接收到的是源在 <b>t − r/c</b> 时的变化。源并没有飞到探针；向外传播的是场的扰动。</p><p><strong>为什么叫横波？</strong>远区辐射电场 E、磁场 B 与传播方向 n 互相垂直。打开 B，在三维空间中，查看这三个方向。沿源的振动轴，线性振荡电荷的辐射项为零。</p></div>
    <details class="prop-model"><summary>公式、标尺与模型边界</summary>
      <div class="prop-equation">E<sub>rad</sub>(r,t) = kq [n × (n × a(t − r/c))] / (c²r)<br>B<sub>rad</sub> = n × E<sub>rad</sub> / c</div>
      <p>这是小振幅、低速电荷的远区辐射项。r 与 n 从源的平均位置测量，采用电偶极近似；<strong>没有绘出库仑项与感应项，也不计算辐射反作用或材料边界</strong>。不能用此图读取近处的总场。</p>
      <p>理想源电荷 q = 1.00 nC，实际位移振幅 A = 0.010 m；显示位移放大 350 倍。振动用两个周期平滑启动，位置、速度、加速度由同一函数求出，避免启动瞬间的伪脉冲。频率范围 30–90 MHz，最大稳态速度低于 0.02c。</p>
      <p id="prop-model-values"></p><p>箭头根部固定在采样点，间距 1.25 m；方向由局部 E 决定，长度按 0.45 tanh(|E| / 0.002 V·m⁻¹) 个场景单位压缩显示，最大约 0.45 单位。默认采样点在 XZ 平面，源沿 Y 振动，辐射电场垂直此平面；切换 XY 才是经过振动轴的二维切面。箭头均为蓝色，正负靠方向区分。A 处的 E、B、n 三箭头只比较方向，不比较不同物理量的长度；两探针读数与图表使用 SI 量值。空间轴相邻短刻度为 20 m。20 m 是本图的显示截断，近远区的判别还与波长有关。</p>
      <p><a href="https://www.feynmanlectures.caltech.edu/I_28.html" target="_blank" rel="noopener">费曼物理学讲义：电磁辐射 ↗</a> · <a href="https://www.feynmanlectures.caltech.edu/I_29.html" target="_blank" rel="noopener">延迟加速度与辐射场 ↗</a> · <a href="https://www.youtube.com/watch?v=aXRTczANuIs" target="_blank" rel="noopener">3Blue1Brown：振动电荷怎样产生光 ↗</a></p>
    </details>
    </div>
  </section>`;
  const $ = selector => host.querySelector(selector);
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { time: 260e-9, frequency: 45e6, running: !preference.matches, showB: false, focusA: false, space: true, parameters: false, visible: true };
  let disposed = false, lastFrame = 0, lastDraw = -Infinity;
  const scene = new FieldScene($('.prop-stage'), { extent: 14 });
  scene.clearLayer('axes'); scene.floor.visible = false; scene.grid.visible = false;
  scene.scene.background.set('#020304'); scene.scene.fog.color.set('#020304'); scene.scene.fog.near = 19; scene.scene.fog.far = 39;
  scene.camera.fov = 43; scene.camera.position.set(8, 6, 13); scene.controls.target.set(0, 0.4, 0); scene.camera.updateProjectionMatrix(); scene.controls.maxDistance = 42;
  const sourceSphere = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 20), new THREE.MeshStandardMaterial({ color: '#ff816c', emissive:'#e54e3f', emissiveIntensity:0.36, roughness:0.58 })); scene.layer('prop-source').add(sourceSphere);
  const axisColor = '#8a939a';
  scene.line([[-13,0,0],[13,0,0]],axisColor,'prop-axes',0.34); scene.line([[0,0,-13],[0,0,13]],axisColor,'prop-axes',0.34); scene.line([[0,-2,0],[0,4,0]],axisColor,'prop-axes',0.34);
  for(let value=-12;value<=12;value+=2){if(!value)continue;scene.line([[value,0,-0.09],[value,0,0.09]],axisColor,'prop-axes',0.3);scene.line([[-0.09,0,value],[0.09,0,value]],axisColor,'prop-axes',0.3);}
  scene.label('y',[0,4.2,0],'#929ba0','prop-axes',0.38);
  // The samples are genuinely in XZ for the default spatial view. Changing
  // to XY changes their physical coordinates, not merely the camera angle.
  const fieldSamples = [], compactView=matchMedia('(max-width:760px)').matches, sampleLimit=compactView?55:96, sampleRadius=compactView?6.8:11.95;
  for(let ix=-sampleLimit;ix<=sampleLimit;ix++)for(let iu=-sampleLimit;iu<=sampleLimit;iu++){
    const x=ix*0.125,u=iu*0.125,r=Math.hypot(x,u); if(r<2.05||r>sampleRadius)continue;
    fieldSamples.push({x,u,r,key:ix*ix+iu*iu,nx:x/r,nu:u/r});
  }
  const shaftPositions = new THREE.Float32BufferAttribute(new Float32Array(fieldSamples.length*6),3);
  const shaftColors = new THREE.Float32BufferAttribute(new Float32Array(fieldSamples.length*6),3);
  const shaftGeometry = new THREE.BufferGeometry();shaftGeometry.setAttribute('position',shaftPositions);shaftGeometry.setAttribute('color',shaftColors);
  const shafts = new THREE.LineSegments(shaftGeometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0.8}));shafts.frustumCulled=false;scene.layer('prop-field').add(shafts);
  const heads = new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,5),new THREE.MeshBasicMaterial({color:'#ffffff'}),fieldSamples.length);heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);heads.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(fieldSamples.length*3),3);heads.frustumCulled=false;scene.layer('prop-field').add(heads);
  const arrowBlue=new THREE.Color('#58a7cc'),arrowColor=new THREE.Color();
  const rootPositions = new THREE.Float32BufferAttribute(new Float32Array(fieldSamples.length*3),3),rootGeometry=new THREE.BufferGeometry();rootGeometry.setAttribute('position',rootPositions);
  const roots=new THREE.Points(rootGeometry,new THREE.PointsMaterial({color:'#397089',size:0.012,transparent:true,opacity:0.34}));roots.frustumCulled=false;scene.layer('prop-field').add(roots);
  $('.prop-stage').dataset.fixedSamples=String(fieldSamples.length);
  const probes = [{ id: 'a', radius: 30, color: '#54d6db' }, { id: 'b', radius: 60, color: '#f5b666' }];
  for (const probe of probes) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), new THREE.MeshBasicMaterial({ color: probe.color })); dot.position.set(probe.radius / 10, 0, 0); scene.layer('prop-probes').add(dot);
    scene.label(probe.id.toUpperCase(), [probe.radius / 10, -0.45, 0], probe.color, 'prop-probes', 0.8);
    $(`#prop-${probe.id}-delay`).textContent = `${fmt(probe.radius / RADIATION.c * 1e9)} ns 后到达`;
  }
  const eArrow = scene.arrow([3, 0, 0], [0, 1, 0], '#6ae9e8', 0.95, 'prop-triad');
  const bArrow = scene.arrow([3, 0, 0], [0, 0, 1], '#c39aff', 0.9, 'prop-triad');
  scene.arrow([3, 0, 0], [1, 0, 0], '#f7cf7c', 0.9, 'prop-triad'); scene.label('传播 n', [4.35, 0.4, 0], '#f7cf7c', 'prop-triad', 0.65);
  const eLabel = scene.label('E', [3, 1.2, 0], '#6ae9e8', 'prop-triad', 0.85), bLabel = scene.label('B', [3, 0, 1.25], '#c39aff', 'prop-triad', 0.85);
  const bOutLabel = scene.label('⊙ B 出屏', [4.3, -1.7, 0], '#c39aff', 'prop-triad', 0.65);
  const bInLabel = scene.label('⊗ B 入屏', [4.3, -1.7, 0], '#c39aff', 'prop-triad', 0.65);
  const probeDelta = (60 - 30) / RADIATION.c; $('#prop-delay-value').textContent = fmt(probeDelta * 1e9);
  const history = $('#prop-history'), context = history.getContext('2d');
  const sceneLabels = []; scene.scene.traverse(object => { if (object.isSprite) sceneLabels.push({ object, scale: object.scale.clone() }); });

  function drawHistory() {
    const width = history.clientWidth, height = 180, ratio = Math.min(devicePixelRatio, 2); if(width < 1) return; const chartEnd = Math.max(END_NS, Math.ceil(state.time * 1e9 / 100) * 100);
    if (history.width !== Math.round(width * ratio)) { history.width = Math.round(width * ratio); history.height = height * ratio; }
    context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height);
    const left = 47, right = width - 16, top = 20, bottom = 145, middle = (top + bottom) / 2, amplitude = radiationPeak(30, { frequency: state.frequency }) * 1.25;
    context.font = '10px Segoe UI, Microsoft YaHei'; context.fillStyle = '#7a909d'; context.strokeStyle = '#30485c'; context.lineWidth = 1;
    for (const ns of [0, chartEnd/4, chartEnd/2, chartEnd*3/4, chartEnd]) { const x = left + ns / chartEnd * (right - left); context.beginPath(); context.moveTo(x, top); context.lineTo(x, bottom); context.stroke(); context.fillText(`${ns}`, x - 7, 165); }
    for (const signed of [-1, 0, 1]) { const y = middle - signed * (bottom - top) / 2; context.beginPath(); context.moveTo(left, y); context.lineTo(right, y); context.stroke(); context.fillText(fmt(signed * amplitude * 1000), 3, y + 3); }
    context.fillText('ns', right - 7, 177);
    for (const probe of probes) {
      const arrivalX = left + probe.radius / RADIATION.c * 1e9 / chartEnd * (right - left);
      context.strokeStyle = probe.color; context.setLineDash([4, 4]); context.beginPath(); context.moveTo(arrivalX, top); context.lineTo(arrivalX, bottom); context.stroke(); context.setLineDash([]);
      context.fillStyle = probe.color; context.fillText(probe.id.toUpperCase(), arrivalX + 4, 13);
      context.lineWidth = 1.5; context.beginPath();
      for (let index = 0; index <= 480; index++) {
        const time = index / 480 * chartEnd * 1e-9; if (time > state.time) break;
        const value = radiationAt([probe.radius, 0, 0], time, { frequency: state.frequency }).E[1];
        const x = left + index / 480 * (right - left), y = middle - value / amplitude * (bottom - top) / 2;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
    }
    const nowX = left + state.time * 1e9 / chartEnd * (right - left); context.strokeStyle = '#546d7b'; context.lineWidth = 1; context.beginPath(); context.moveTo(nowX, top); context.lineTo(nowX, bottom); context.stroke();
  }
  function syncPlay() { $('#prop-play').textContent = state.running ? '暂停' : '振荡'; $('#prop-play').setAttribute('aria-pressed', String(state.running)); }
  function draw() {
    const options = { frequency: state.frequency }, source = drivenSource(state.time, options);
    sourceSphere.position.y = source.position[1] / METRES_PER_UNIT * SOURCE_MAGNIFICATION;
    const radialFields=new Map();
    for(let index=0;index<fieldSamples.length;index++){
      const item=fieldSamples[index],y=state.space?0:item.u,z=state.space?item.u:0;
      let equatorialEy=radialFields.get(item.key);
      if(equatorialEy===undefined){equatorialEy=radiationAt([item.r*METRES_PER_UNIT,0,0],state.time,options).E[1];radialFields.set(item.key,equatorialEy);}
      // Same n×(n×a) radiation term, reusing the retarded acceleration at equal r.
      const ex=state.space?0:-equatorialEy*item.nx*item.nu,ey=state.space?equatorialEy:equatorialEy*item.nx*item.nx,magnitude=Math.hypot(ex,ey);
      const length=0.45*Math.tanh(magnitude/0.002),headLength=length*0.3,headWidth=length*0.095;
      const dx=magnitude>0?ex/magnitude:0,dy=magnitude>0?ey/magnitude:1;
      const tx=item.x+dx*length,ty=y+dy*length,tz=z;
      shaftPositions.setXYZ(index*2,item.x,y,z);shaftPositions.setXYZ(index*2+1,tx,ty,tz);
      const fade=0.24+0.76*Math.min(1,magnitude/0.002);arrowColor.copy(arrowBlue).multiplyScalar(fade);
      shaftColors.setXYZ(index*2,arrowColor.r,arrowColor.g,arrowColor.b);shaftColors.setXYZ(index*2+1,arrowColor.r,arrowColor.g,arrowColor.b);
      // Right-handed basis maps each cone's +Y to the true E direction.
      const matrix=heads.instanceMatrix.array,offset=index*16;matrix[offset]=dy*headWidth;matrix[offset+1]=-dx*headWidth;matrix[offset+2]=0;matrix[offset+4]=dx*headLength;matrix[offset+5]=dy*headLength;matrix[offset+6]=0;matrix[offset+8]=0;matrix[offset+9]=0;matrix[offset+10]=headWidth;matrix[offset+12]=tx-dx*headLength/2;matrix[offset+13]=ty-dy*headLength/2;matrix[offset+14]=tz;matrix[offset+15]=1;heads.instanceColor.setXYZ(index,arrowColor.r,arrowColor.g,arrowColor.b);
      rootPositions.setXYZ(index,item.x,y,z);
    }
    shaftPositions.needsUpdate=true;shaftColors.needsUpdate=true;rootPositions.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;heads.instanceColor.needsUpdate=true;
    scene.layer('prop-triad').visible=state.focusA;scene.layer('prop-probes').visible=state.parameters;
    scene.layer('prop-source').visible=true;scene.layer('prop-axes').visible=state.space;
    for(const label of sceneLabels)label.object.scale.copy(label.scale).multiplyScalar(state.focusA?0.55:1);
    bOutLabel.position.set(3.7,-1.25,0);bInLabel.position.copy(bOutLabel.position);
    $('#prop-focus-a').textContent=state.focusA?'回到整片电场':'暂停，近看 A 点';$('#prop-b-control').hidden=!state.focusA;
    $('.prop-stage').dataset.display=state.space?'xz-vectors':'xy-vectors';
    for (const probe of probes) {
      const field = radiationAt([probe.radius, 0, 0], state.time, options), element = $(`#prop-${probe.id}-reading`);
      element.dataset.e = String(field.E[1]); element.dataset.retardedNs = String(field.retardedTime * 1e9);
      element.textContent = field.retardedTime <= 0 ? '尚未收到启动后的变化' : `Eᵧ = ${fmt(field.E[1] * 1000, 3)} mV/m · 来自 ${fmt(field.retardedTime * 1e9)} ns 时的源`;
      if (probe.id === 'a') {
        const present = norm(field.E) > 1e-9, sign = field.E[1] >= 0 ? 1 : -1;
        eArrow.visible = present; eLabel.visible = present; eArrow.setDirection(new THREE.Vector3(0, sign, 0)); eLabel.position.y = sign * 1.2;
        bArrow.visible = state.showB && present; bLabel.visible = state.showB && present && state.space;
        bOutLabel.visible = state.showB && present && !state.space && sign > 0; bInLabel.visible = state.showB && present && !state.space && sign < 0;
        bArrow.setDirection(new THREE.Vector3(0, 0, sign)); bLabel.position.z = sign * 1.25;
        $('#prop-triad-note').textContent = state.showB ? present ? `A 处：E、B、传播方向 n 互相垂直。${state.space ? `B 沿 ${sign>0?'+':'−'}z` : `相对 XY 切面，B${sign>0?'朝外':'朝里'}`}，当前 |B| = ${fmt(norm(field.B) * 1e12, 2)} pT。局部三箭头只比较方向。` : 'A 处辐射电场与磁场此刻均为零，暂不画方向箭头。到达后再转动三维视角，查看 E、B、n 的垂直关系。' : state.focusA ? 'A 处放大的青色箭头表示此刻电场方向，金色 n 指向传播方向。再加 B，比较三个方向。' : '先看整片箭头如何依次响应，再暂停看一个位置。';
      }
    }
    $('#prop-time').max = Math.max(400, Math.ceil(state.time * 1e9 / 100) * 100); $('#prop-time').value = state.time * 1e9; $('#prop-time-value').textContent = `${fmt(state.time * 1e9)} ns`;
    $('#prop-scene-message').textContent = state.time < 30 / RADIATION.c ? '启动后的变化尚未到达 A。源在动，远处仍有延迟。' : state.time < 60 / RADIATION.c ? 'A 已收到变化，B 还在等待。' : 'A 与 B 都收到了变化，但收到的是源的不同时刻。';
    $('.prop-stage').dataset.timeNs = String(state.time * 1e9);
    $('#prop-model-values').textContent = `当前频率 ${fmt(state.frequency / 1e6, 0)} MHz；波长 c/f = ${fmt(RADIATION.c / state.frequency, 2)} m；源最大稳态速度 ${fmt(2 * Math.PI * state.frequency * RADIATION.amplitude / RADIATION.c * 100, 2)}% c。两探针传播时延分别为 100.1 ns 和 200.1 ns，同一次变化的时间差始终为 ${fmt(probeDelta * 1e9)} ns。`;
    if(state.parameters) drawHistory();
  }
  scene.frameFn = now => {
    const elapsed = lastFrame ? Math.min(0.08, (now - lastFrame) / 1000) : 0; lastFrame = now;
    if (disposed || !state.visible) return;
    const advancing = state.running;
    if (advancing) state.time += elapsed * 30e-9;
    if (advancing && (now - lastDraw > 35 || !state.running)) { draw(); lastDraw = now; }
  };
  function restart() { state.time = 0; state.running = !preference.matches; draw(); syncPlay(); }
  $('#prop-play').addEventListener('click', () => { state.running = !state.running; draw(); syncPlay(); });
  $('#prop-restart').addEventListener('click', restart);
  $('#prop-frequency').addEventListener('input', () => { state.frequency = +$('#prop-frequency').value * 1e6; $('#prop-frequency-value').textContent = `${fmt(state.frequency / 1e6, 0)} MHz`; restart(); });
  $('#prop-time').addEventListener('input', () => { state.time = +$('#prop-time').value * 1e-9; state.running = false; draw(); syncPlay(); });
  function frameView(space = state.space) {
    state.space = space;
    const position = state.focusA ? space ? [7,4,7] : [3,0,8] : space ? [8,6,13] : [0,0,29];
    scene.controls.target.set(state.focusA ? 3 : 0, state.focusA || !space ? 0 : 0.4, 0);
    if (preference.matches) { scene.camera.position.set(...position); scene.controls.update(); }
    else { scene.cameraMove = { from: scene.camera.position.clone(), to: new THREE.Vector3(...position), start: performance.now() }; scene.controls.enabled = false; }
    host.querySelectorAll('[data-prop-view]').forEach(button => button.classList.toggle('active', (button.dataset.propView === 'space') === space));
  }
  $('#prop-focus-a').addEventListener('click', () => { state.focusA = !state.focusA; if (state.focusA) state.running = false; else { state.showB = false; $('#prop-show-b').checked = false; } frameView(); draw(); syncPlay(); });
  $('#prop-params-toggle').addEventListener('click',()=>{state.parameters=!state.parameters;$('#prop-parameters').hidden=!state.parameters;$('#prop-params-toggle').setAttribute('aria-expanded',String(state.parameters));$('#prop-params-toggle').textContent=state.parameters?'收起解释':'参数与解释';draw();});
  $('#prop-show-b').addEventListener('change', () => { state.showB = $('#prop-show-b').checked; draw(); });
  host.querySelectorAll('[data-prop-view]').forEach(button => button.addEventListener('click', () => {
    frameView(button.dataset.propView === 'space'); draw();
  }));
  const observer = new ResizeObserver(() => drawHistory()); observer.observe(history);
  const visibility = new IntersectionObserver(entries => { state.visible = entries[0].isIntersecting; }); visibility.observe($('.prop-stage'));
  const motionChanged = event => { if (event.matches) { state.running = false; syncPlay(); } }; preference.addEventListener('change', motionChanged);
  syncPlay(); draw();
  return () => { disposed = true; preference.removeEventListener('change', motionChanged); observer.disconnect(); visibility.disconnect(); scene.dispose(); host.innerHTML = ''; };
}

