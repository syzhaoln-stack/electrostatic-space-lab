import * as THREE from 'three';
import { FieldScene } from './scene.js';
import { MOVING_CHARGE, movingSource, movingChargeAt } from './moving-charge-physics.js';

const METRES_PER_UNIT = 10, END_NS = 600, FIELD_SCALE = 0.008, ARROW_MAX = 0.22;
const norm = vector => Math.hypot(...vector);
const fmt = (value, digits = 1) => (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits);

export function mountPropagation(host) {
  if (!document.querySelector('link[data-propagation-style]')) {
    const sheet = document.createElement('link'); sheet.rel = 'stylesheet'; sheet.href = new URL('./propagation.css', import.meta.url).href; sheet.dataset.propagationStyle = ''; document.head.append(sheet);
  }
  host.innerHTML = `<section class="propagation-lab">
    <div class="prop-toolbar"><span>振荡与传播</span><div><button id="prop-play">暂停</button><button id="prop-restart">重播</button><button id="prop-params-toggle" aria-expanded="false" aria-controls="prop-parameters">参数与解释</button></div></div>
    <div class="prop-field-modes" aria-label="选择显示的电场"><button data-prop-field="total" class="active" aria-pressed="true">完整电场</button><button data-prop-field="radiation" aria-pressed="false">只看辐射分量</button><span id="prop-component-note">近处向外发散，远处随振荡改变。</span></div>
    <div class="prop-stage-wrap"><div class="prop-stage"></div><div class="prop-stage-caption"><strong>箭头留在原位，变化向外传播。</strong><span id="prop-lattice-caption">15 MHz · 均匀空间采样</span></div><div class="prop-stage-bottom">运动点电荷模型 · 源图标放大，位置按真实比例 · 拖动旋转，双指或滚轮缩放</div></div>
    <div id="prop-parameters" class="prop-parameters" hidden>
      <p class="prop-model-intro">每支箭头表示一个固定位置的电场。完整电场包含近处的速度场与向外传播的加速度场；切换分量，再比较远近两个位置收到变化的时刻。</p>
      <div class="prop-parameter-grid"><div class="prop-panel">
        <div class="prop-views"><button data-prop-view="space" class="active">XZ 空间</button><button data-prop-view="front">XY 二维切面</button></div>
        <div class="prop-control"><label for="prop-frequency">振动频率 <output id="prop-frequency-value">15 MHz</output></label><input id="prop-frequency" type="range" min="10" max="20" step="1" value="15"><small>默认 15 MHz，让同屏波纹更易分辨。改频率会重播；传播速度始终为 c。</small></div>
        <div class="prop-control"><label for="prop-time">回看时刻 <output id="prop-time-value">450.0 ns</output></label><input id="prop-time" type="range" min="0" max="600" step="0.5" value="450"><small>拖动即暂停。动画 1 秒对应 30 ns。</small></div>
        <button id="prop-focus-a" class="prop-focus-button">暂停，近看 A 点</button><label class="prop-check" id="prop-b-control" hidden><input type="checkbox" id="prop-show-b"> 再加上磁场 B</label><p id="prop-triad-note" class="prop-small">箭头根部不移动，表示该位置电场的方向与强弱。</p>
      </div><div class="prop-panel">
        <div class="prop-probe" data-prop-probe="a"><div><strong>A · 距源 30 m</strong><span id="prop-a-delay"></span></div><p id="prop-a-reading"></p></div>
        <div class="prop-probe" data-prop-probe="b"><div><strong>B · 距源 60 m</strong><span id="prop-b-delay"></span></div><p id="prop-b-reading"></p></div>
        <div class="prop-delay"><span>同一次变化</span><strong>B 比 A 晚约 <b id="prop-delay-value">100.1</b> ns</strong><small>平均距离差 ÷ 光速；实际场按运动源的真实迟滞位置计算。</small></div><p id="prop-scene-message" class="prop-small"></p>
      </div></div>
    <div class="prop-chart-card"><div class="prop-chart-title"><strong>两个位置，收到的是不同时刻的变化。</strong><span>同一纵轴：E<sub>y</sub> / mV·m⁻¹</span></div><canvas id="prop-history" height="180" aria-label="两个探针所选电场分量随时间变化，显示真实迟滞场"></canvas><p>青色是 A，橙色是 B。竖虚线标记启动变化的首次到达；图表与上方当前选择的电场分量一致。</p></div>
    <div class="prop-lesson"><p><strong>从哪里来的延迟？</strong>先找到源在过去的哪个位置：满足 <b>t − tᵣ = |r − r源(tᵣ)|/c</b>。这里从真实轨迹求迟滞时刻；源没有飞到探针，向外传播的是场的变化。</p><p><strong>为什么叫横波？</strong>单独显示传播分量时，电场与从迟滞源指向观察点的 n 垂直。完整电场还含近处速度场，不能把整个电场都当作横波。A 处可显示实际 E、B 与 n，方向取自同一迟滞解。</p></div>
    <details class="prop-model"><summary>公式、标尺与模型边界</summary>
      <div class="prop-equation">E = E速度 + E加速度<br>B = n × E / c</div>
      <p>采用运动点电荷的 Liénard–Wiechert 场，速度项和加速度项都在真实迟滞时刻求值。完整电场按两项矢量相加；“只看辐射分量”显示加速度项，在近处也使用完整表达式，不套用远区近似。给定源的运动由外部驱动，不计算辐射反作用、材料或其他电荷。</p>
      <p>源电荷 q = 1.00 nC，位移振幅 A = 0.30 m；频率 10–20 MHz，默认 15 MHz，最大稳态速度约 0.126c。用两个周期平滑启动。红球是放大的点源图标，位移仍按真实比例，所以在这一大范围视图中运动幅度很小。</p>
      <p id="prop-model-values"></p><p>固定、均匀的笛卡尔格点间距 2.5 m，显示半径 60 m；只跳过点源图标中心的奇点，不挖去整个近场。最短波长约 15 m，每波长沿轴约 6 个采样间距；即使计入源运动造成的最强波长压缩，仍超过 5 个间距。每支箭头的三维方向均来自真实 E；长度以 0.22 tanh(|E| / 0.008 V·m⁻¹) 个场景单位压缩，所有时刻、频率与分量都使用同一标尺，不逐帧归一化。最大长度约 0.22 单位，小于采样间距 0.25 单位，箭头不连成线。</p>
      <p>XZ 和 XY 选项改变实际采样位置。传播分量相对于真实迟滞方向为横向，完整电场一般还含径向分量。A 处放大的 E、B、n 箭头只比较方向；读数与图表使用 SI 数值。轴刻度为 20 m。</p>
      <p><a href="https://galileoandeinstein.phys.virginia.edu/Elec_Mag/2022_Lectures/EM_67_Lienard_Weichert.html" target="_blank" rel="noopener">弗吉尼亚大学：完整运动电荷场 ↗</a> · <a href="https://www.feynmanlectures.caltech.edu/I_28.html" target="_blank" rel="noopener">费曼物理学讲义：电磁辐射 ↗</a> · <a href="https://www.feynmanlectures.caltech.edu/I_29.html" target="_blank" rel="noopener">延迟加速度与辐射场 ↗</a> · <a href="https://www.youtube.com/watch?v=aXRTczANuIs" target="_blank" rel="noopener">3Blue1Brown：振动电荷怎样产生光 ↗</a></p>
    </details>
    </div>
  </section>`;
  const $ = selector => host.querySelector(selector);
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { time: 450e-9, frequency: 15e6, component: 'total', running: !preference.matches, showB: false, focusA: false, space: true, parameters: false, visible: true };
  let disposed = false, lastFrame = 0, lastDraw = -Infinity;
  const scene = new FieldScene($('.prop-stage'), { extent: 14 });
  scene.clearLayer('axes'); scene.floor.visible = false; scene.grid.visible = false;
  scene.scene.background.set('#020304'); scene.scene.fog.color.set('#020304'); scene.scene.fog.near = 14; scene.scene.fog.far = 27;
  scene.camera.fov = 43; scene.camera.position.set(5, 7, 10); scene.controls.target.set(0, 0.4, 0); scene.camera.updateProjectionMatrix(); scene.controls.maxDistance = 42;
  const sourceSphere = new THREE.Mesh(new THREE.SphereGeometry(0.29, 28, 20), new THREE.MeshStandardMaterial({ color: '#ff816c', emissive:'#e54e3f', emissiveIntensity:0.36, roughness:0.58 })); scene.layer('prop-source').add(sourceSphere);
  const axisColor = '#64747c';
  scene.line([[-6.5,0,0],[6.5,0,0]],axisColor,'prop-axes',0.19); scene.line([[0,0,-6.5],[0,0,6.5]],axisColor,'prop-axes',0.19); scene.line([[0,-1.3,0],[0,2,0]],axisColor,'prop-axes',0.22);
  for(let value=-6;value<=6;value+=2){if(!value)continue;scene.line([[value,0,-0.09],[value,0,0.09]],axisColor,'prop-axes',0.3);scene.line([[-0.09,0,value],[0.09,0,value]],axisColor,'prop-axes',0.3);}
  scene.label('y',[0,2.2,0],'#929ba0','prop-axes',0.38);
  // The samples are genuinely in XZ for the default spatial view. Changing
  // to XY changes their physical coordinates, not merely the camera angle.
  const fieldSamples = [], sampleLimit=24, sampleRadius=6.0;
  for(let ix=-sampleLimit;ix<=sampleLimit;ix++)for(let iu=-sampleLimit;iu<=sampleLimit;iu++){
    const x=ix*0.25,u=iu*0.25,r=Math.hypot(x,u); if(r<0.05||r>sampleRadius)continue;
    fieldSamples.push({x,u});
  }
  const shaftPositions = new THREE.Float32BufferAttribute(new Float32Array(fieldSamples.length*6),3);
  const shaftColors = new THREE.Float32BufferAttribute(new Float32Array(fieldSamples.length*6),3);
  const shaftGeometry = new THREE.BufferGeometry();shaftGeometry.setAttribute('position',shaftPositions);shaftGeometry.setAttribute('color',shaftColors);
  const shafts = new THREE.LineSegments(shaftGeometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0.93}));shafts.frustumCulled=false;scene.layer('prop-field').add(shafts);
  const heads = new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,5),new THREE.MeshBasicMaterial({color:'#ffffff'}),fieldSamples.length);heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);heads.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(fieldSamples.length*3),3);heads.frustumCulled=false;scene.layer('prop-field').add(heads);
  const arrowBlue=new THREE.Color('#6bbad5'),arrowColor=new THREE.Color();
  $('.prop-stage').dataset.fixedSamples=String(fieldSamples.length);$('.prop-stage').dataset.sampleSpacingM='2.5';
  const probes = [{ id: 'a', radius: 30, color: '#54d6db' }, { id: 'b', radius: 60, color: '#f5b666' }];
  for (const probe of probes) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), new THREE.MeshBasicMaterial({ color: probe.color })); dot.position.set(probe.radius / 10, 0, 0); scene.layer('prop-probes').add(dot);
    scene.label(probe.id.toUpperCase(), [probe.radius / 10, -0.45, 0], probe.color, 'prop-probes', 0.8);
    $(`#prop-${probe.id}-delay`).textContent = `${fmt(probe.radius / MOVING_CHARGE.c * 1e9)} ns 后到达`;
  }
  const eArrow = scene.arrow([3, 0, 0], [0, 1, 0], '#6ae9e8', 0.95, 'prop-triad');
  const bArrow = scene.arrow([3, 0, 0], [0, 0, 1], '#c39aff', 0.9, 'prop-triad');
  const nArrow=scene.arrow([3, 0, 0], [1, 0, 0], '#f7cf7c', 0.9, 'prop-triad'),nLabel=scene.label('方向 n', [4.35, 0.4, 0], '#f7cf7c', 'prop-triad', 0.65);
  const eLabel = scene.label('E', [3, 1.2, 0], '#6ae9e8', 'prop-triad', 0.85), bLabel = scene.label('B', [3, 0, 1.25], '#c39aff', 'prop-triad', 0.85);
  const bOutLabel = scene.label('⊙ B 出屏', [4.3, -1.7, 0], '#c39aff', 'prop-triad', 0.65);
  const bInLabel = scene.label('⊗ B 入屏', [4.3, -1.7, 0], '#c39aff', 'prop-triad', 0.65);
  const probeDelta = (60 - 30) / MOVING_CHARGE.c; $('#prop-delay-value').textContent = fmt(probeDelta * 1e9);
  const history = $('#prop-history'), context = history.getContext('2d');
  const sceneLabels = []; scene.scene.traverse(object => { if (object.isSprite) sceneLabels.push({ object, scale: object.scale.clone() }); });

  function drawHistory() {
    const width = history.clientWidth, height = 180, ratio = Math.min(devicePixelRatio, 2); if(width < 1) return; const chartEnd = Math.max(END_NS, Math.ceil(state.time * 1e9 / 100) * 100);
    if (history.width !== Math.round(width * ratio)) { history.width = Math.round(width * ratio); history.height = height * ratio; }
    context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height);
    const left = 47, right = width - 16, top = 20, bottom = 145, middle = (top + bottom) / 2, amplitude = (MOVING_CHARGE.k*MOVING_CHARGE.charge*MOVING_CHARGE.amplitude*(2*Math.PI*state.frequency)**2/(MOVING_CHARGE.c**2*30)+MOVING_CHARGE.k*MOVING_CHARGE.charge/30**2) * 1.35;
    context.font = '10px Segoe UI, Microsoft YaHei'; context.fillStyle = '#7a909d'; context.strokeStyle = '#30485c'; context.lineWidth = 1;
    for (const ns of [0, chartEnd/4, chartEnd/2, chartEnd*3/4, chartEnd]) { const x = left + ns / chartEnd * (right - left); context.beginPath(); context.moveTo(x, top); context.lineTo(x, bottom); context.stroke(); context.fillText(`${ns}`, x - 7, 165); }
    for (const signed of [-1, 0, 1]) { const y = middle - signed * (bottom - top) / 2; context.beginPath(); context.moveTo(left, y); context.lineTo(right, y); context.stroke(); context.fillText(fmt(signed * amplitude * 1000), 3, y + 3); }
    context.fillText('ns', right - 7, 177);
    for (const probe of probes) {
      const arrivalX = left + probe.radius / MOVING_CHARGE.c * 1e9 / chartEnd * (right - left);
      context.strokeStyle = probe.color; context.setLineDash([4, 4]); context.beginPath(); context.moveTo(arrivalX, top); context.lineTo(arrivalX, bottom); context.stroke(); context.setLineDash([]);
      context.fillStyle = probe.color; context.fillText(probe.id.toUpperCase(), arrivalX + 4, 13);
      context.lineWidth = 1.5; context.beginPath();
      for (let index = 0; index <= 480; index++) {
        const time = index / 480 * chartEnd * 1e-9; if (time > state.time) break;
        const sample=movingChargeAt([probe.radius,0,0],time,{frequency:state.frequency});const value=(state.component==='total'?sample.E:sample.radiationE)[1];
        const x = left + index / 480 * (right - left), y = middle - value / amplitude * (bottom - top) / 2;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
    }
    const nowX = left + state.time * 1e9 / chartEnd * (right - left); context.strokeStyle = '#546d7b'; context.lineWidth = 1; context.beginPath(); context.moveTo(nowX, top); context.lineTo(nowX, bottom); context.stroke();
  }
  function syncPlay() { $('#prop-play').textContent = state.running ? '暂停' : '振荡'; $('#prop-play').setAttribute('aria-pressed', String(state.running)); }
  function draw() {
    const options = { frequency: state.frequency }, source = movingSource(state.time, options);
    sourceSphere.position.set(...source.position.map(v=>v/METRES_PER_UNIT));
    const arrowPose=new THREE.Object3D(),arrowDirection=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
    for(let index=0;index<fieldSamples.length;index++){
      const item=fieldSamples[index],y=state.space?0:item.u,z=state.space?item.u:0;
      const sample=movingChargeAt([item.x*METRES_PER_UNIT,y*METRES_PER_UNIT,z*METRES_PER_UNIT],state.time,options);
      const E=state.component==='total'?sample.E:sample.radiationE,magnitude=norm(E),length=ARROW_MAX*Math.tanh(magnitude/FIELD_SCALE),headLength=length*.33,headWidth=length*.11;
      arrowDirection.set(...E);if(magnitude>0)arrowDirection.divideScalar(magnitude);else arrowDirection.set(0,1,0);
      const tip=new THREE.Vector3(item.x,y,z).addScaledVector(arrowDirection,length);
      shaftPositions.setXYZ(index*2,item.x,y,z);shaftPositions.setXYZ(index*2+1,tip.x,tip.y,tip.z);
      const fade=.24+.76*Math.tanh(magnitude/FIELD_SCALE);arrowColor.copy(arrowBlue).multiplyScalar(fade);
      shaftColors.setXYZ(index*2,arrowColor.r,arrowColor.g,arrowColor.b);shaftColors.setXYZ(index*2+1,arrowColor.r,arrowColor.g,arrowColor.b);
      arrowPose.quaternion.setFromUnitVectors(up,arrowDirection);arrowPose.position.copy(tip).addScaledVector(arrowDirection,-headLength/2);arrowPose.scale.set(headWidth,headLength,headWidth);arrowPose.updateMatrix();heads.setMatrixAt(index,arrowPose.matrix);heads.setColorAt(index,arrowColor);
    }
    shaftPositions.needsUpdate=true;shaftColors.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;heads.instanceColor.needsUpdate=true;
    scene.layer('prop-triad').visible=state.focusA;scene.layer('prop-probes').visible=state.parameters;
    scene.layer('prop-source').visible=true;scene.layer('prop-axes').visible=state.space;
    for(const label of sceneLabels)label.object.scale.copy(label.scale).multiplyScalar(state.focusA?0.55:1);
    bOutLabel.position.set(3.7,-1.25,0);bInLabel.position.copy(bOutLabel.position);
    $('#prop-focus-a').textContent=state.focusA?'回到整片电场':'暂停，近看 A 点';$('#prop-b-control').hidden=!state.focusA;
    $('.prop-stage').dataset.display=state.space?'xz-vectors':'xy-vectors';$('.prop-stage').dataset.component=state.component;
    for (const probe of probes) {
      const fullField=movingChargeAt([probe.radius,0,0],state.time,options);const selectedE=state.component==='total'?fullField.E:fullField.radiationE;const selectedB=new THREE.Vector3(...fullField.n).cross(new THREE.Vector3(...selectedE)).multiplyScalar(1/MOVING_CHARGE.c).toArray();const field={...fullField,E:selectedE,B:selectedB}, element = $(`#prop-${probe.id}-reading`);
      element.dataset.e = String(field.E[1]); element.dataset.retardedNs = String(field.retardedTime * 1e9);
      element.textContent = field.retardedTime <= 0 ? (state.component==='total'?'尚未收到启动后的变化；静止源的库仑场已存在':'尚未收到启动后的变化') : `Eᵧ = ${fmt(field.E[1] * 1000, 3)} mV/m · 来自 ${fmt(field.retardedTime * 1e9)} ns 时的源`;
      if (probe.id === 'a') {
        const present=norm(field.E)>1e-9,bPresent=norm(field.B)>1e-19,sign=field.B[2]>=0?1:-1;nArrow.setDirection(new THREE.Vector3(...field.n));nLabel.position.copy(new THREE.Vector3(3,0,0).add(new THREE.Vector3(...field.n).multiplyScalar(1.3)));
        eArrow.visible = present; eLabel.visible = present; eArrow.setDirection(new THREE.Vector3(...field.E).normalize()); eLabel.position.copy(new THREE.Vector3(3,0,0).add(new THREE.Vector3(...field.E).normalize().multiplyScalar(1.2)));
        bArrow.visible = state.showB && bPresent; bLabel.visible = state.showB && bPresent && state.space;
        bOutLabel.visible = state.showB && bPresent && !state.space && sign > 0; bInLabel.visible = state.showB && bPresent && !state.space && sign < 0;
        if(bPresent)bArrow.setDirection(new THREE.Vector3(...field.B).normalize()); bLabel.position.copy(new THREE.Vector3(3,0,0).add(new THREE.Vector3(...field.B).normalize().multiplyScalar(1.25)));
        $('#prop-triad-note').textContent = state.showB ? !bPresent ? '此刻 B = 0，没有磁场方向。若完整电场仍存在，可继续看 E 的方向；零向量不画箭头。' :
          `A 处：${state.component==='radiation'?'辐射 E 垂直于 n，B 垂直于二者。':'B 垂直于 E 与 n；完整 E 可含径向分量。'}${state.space ? `B 沿 ${sign>0?'+':'−'}z` : `相对 XY 切面，B${sign>0?'朝外':'朝里'}`}，当前 |B| = ${fmt(norm(field.B)*1e12,2)} pT。局部箭头只比较方向。` :
          state.focusA ? 'A 处青色箭头表示电场方向，金色 n 从迟滞源指向 A。再加 B，比较三个方向。' : '先看整片箭头如何依次响应，再暂停看一个位置。';
      }
    }
    $('#prop-time').max = Math.max(END_NS, Math.ceil(state.time * 1e9 / 100) * 100); $('#prop-time').value = state.time * 1e9; $('#prop-time-value').textContent = `${fmt(state.time * 1e9)} ns`;
    $('#prop-scene-message').textContent = state.time < 30 / MOVING_CHARGE.c ? '启动后的变化尚未到达 A。源在动，远处仍有延迟。' : state.time < 60 / MOVING_CHARGE.c ? 'A 已收到变化，B 还在等待。' : 'A 与 B 都收到了变化，但收到的是源的不同时刻。';
    $('.prop-stage').dataset.timeNs = String(state.time * 1e9);$('.prop-stage').dataset.frequencyMhz=String(state.frequency/1e6);$('#prop-lattice-caption').textContent=`${fmt(state.frequency/1e6,0)} MHz · 均匀空间采样`;
    $('#prop-model-values').textContent = `当前频率 ${fmt(state.frequency / 1e6, 0)} MHz；波长 c/f = ${fmt(MOVING_CHARGE.c / state.frequency, 2)} m；源最大稳态速度 ${fmt(2 * Math.PI * state.frequency * MOVING_CHARGE.amplitude / MOVING_CHARGE.c * 100, 2)}% c。两探针距平均源位置的传播时间约为 100.1 ns 和 200.1 ns，距离差对应约 ${fmt(probeDelta * 1e9)} ns。`;
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
  host.querySelectorAll('[data-prop-field]').forEach(button=>button.addEventListener('click',()=>{state.component=button.dataset.propField;host.querySelectorAll('[data-prop-field]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});$('#prop-component-note').textContent=state.component==='total'?'近处向外发散，远处随振荡改变。':'只保留加速度项，观察变化向外传播。';draw();}));
  $('#prop-play').addEventListener('click', () => { state.running = !state.running; draw(); syncPlay(); });
  $('#prop-restart').addEventListener('click', restart);
  $('#prop-frequency').addEventListener('input', () => { state.frequency = +$('#prop-frequency').value * 1e6; $('#prop-frequency-value').textContent = `${fmt(state.frequency / 1e6, 0)} MHz`; restart(); });
  $('#prop-time').addEventListener('input', () => { state.time = +$('#prop-time').value * 1e-9; state.running = false; draw(); syncPlay(); });
  function frameView(space = state.space) {
    state.space = space;
    const position = state.focusA ? space ? [7,4,7] : [3,0,8] : space ? [5,7,10] : [0,0,18];
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

