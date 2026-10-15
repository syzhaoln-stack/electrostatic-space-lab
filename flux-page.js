import * as THREE from 'three';
import { FieldScene } from './scene.js';
import { CONSTANTS, fieldAt, gaussianFlux } from './physics.js';
import { enclosedSphereFraction } from './flux-physics.js';
import { buildFluxLine } from './flux-journey.js';
import { evaluateFluxGoal } from './flux-goal.js';

const R = 2.1, SOURCE_RADIUS = 0.42, Q0 = 0.1;
const UNIT = Q0 * 1e-12 / CONSTANTS.epsilon0;
const NU = 18, NP = 36;
const norm = vector => Math.hypot(...vector);
const clean = (value, digits = 2) => (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits);
const STEPS = [
  { title: '先看红球周围的方向', text: '红球带正电，周围的电场朝外。短箭头沿着场线移动，只帮助你看方向。再加一个包围面，看看线在哪里穿过它。' },
  { title: '把电荷慢慢移进去', text: '拖动电荷位置，看看包住的电荷怎样增加。所有小片的贡献相加，会跟着怎样变化？' },
  { title: '换一种形状，结果呢？', text: '电荷留在中央，只把包围面压扁、拉长。各处的方向和大小会变，总和会不会变？' },
];
const MYSTERIES = [
  { sources: [{ pos: [0, 0, 0], Q: Q0 }], net: 1, reveal: '里面是一团正电荷，总量 +Q₀。测得正通量，正确推出内部净电荷为正。' },
  { sources: [{ pos: [0, 0, 0], Q: -Q0 }], net: -1, reveal: '里面是一团负电荷，总量 −Q₀。电场净穿入，所以总通量为负。' },
  { sources: [{ pos: [-0.7, 0, 0], Q: Q0 }, { pos: [0.7, 0, 0], Q: -Q0 }], net: 0, reveal: '里面有一正一负，电荷量相等。总通量为零，只能推出净电荷为零，不能推出内部没有电荷。' },
];

export function mountFlux(container) {
  if (!document.querySelector('link[data-flux-style]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet'; stylesheet.href = new URL('./flux.css', import.meta.url).href;
    stylesheet.dataset.fluxStyle = ''; document.head.append(stylesheet);
  }
  container.innerHTML = `<div class="flux-experience">
    <div class="flux-steps" aria-label="逐步理解电通量">
      <button data-flux-step="2" aria-pressed="false"><span>移动电荷</span></button>
      <button data-flux-step="3" aria-pressed="false"><span>改变形状</span></button>
    </div>
    <div class="flux-overview-tools"><span id="flux-drag-hint">拖动红球，沿水平移入或移出</span><div><button data-flux-placement="outside">移到外部</button><button data-flux-placement="inside">移到内部</button><button data-flux-sign="1" aria-pressed="true">正电荷 +</button><button data-flux-sign="-1" aria-pressed="false">负电荷 −</button></div></div>
    <div class="lab-layout flux-lab">
      <div class="stage-wrap">
        <div class="stage" aria-label="可旋转的闭合面与带电球三维模型"></div>
        <div class="stage-top"><div class="scene-label"><strong id="flux-scene-title">先看电场朝哪里</strong><span class="pill" id="flux-scene-pill">方向标记 · 非电子</span></div>
          <div class="view-switch"><button class="active" data-flux-view="iso">空间</button><button data-flux-view="front">正视</button><button data-flux-view="top">俯视</button></div></div>
        <div class="flux-scene-note" id="flux-scene-note">电荷在外面，闭合面仍有穿入、穿出的贡献。</div>
        <div class="flux-stage-key" id="flux-crossing-key" hidden><span class="flux-in">● 穿入：负贡献</span><span class="flux-out">● 穿出：正贡献</span></div>
        <div class="flux-line-readout"><strong id="flux-line-summary">一条场线：穿入 −，穿出 +</strong><span id="flux-line-note">总通量由整个面的面积积分计算</span></div>
        <div class="stage-bottom"><div class="flux-motion-tools"><button id="flux-flow-toggle" aria-pressed="true">暂停方向标记</button><span>标记速度没有物理含义</span></div><span class="flux-surface-note" id="flux-surface-note">拖动旋转观察</span></div>
      </div>
      <aside class="panel flux-panel">
        <div class="eyebrow" id="flux-step-label">第 1 步 / 共 3 步</div>
        <h2 id="flux-step-title"></h2><p id="flux-step-text"></p>
        <button id="flux-add-surface" class="primary flux-add-surface">显示包围面</button>
        <div id="flux-patch-controls" class="flux-patch-controls" hidden><button data-flux-patch="left" class="active">看左边一片</button><button data-flux-patch="right">看右边一片</button></div>
        <div id="flux-move-controls" hidden>
          <div class="control"><label for="flux-source-x">电荷位置 <output id="flux-source-label">完全在外面</output></label><input id="flux-source-x" type="range" min="-3.7" max="3.7" step="0.01" value="-3.7"><div class="range-ends"><span>左侧外部</span><span>右侧外部</span></div></div>
          <button id="flux-play" class="primary">看它移进去</button>
        </div>
        <div id="flux-shape-controls" hidden>
          <div class="control"><label for="flux-shape">左右拉伸这个面 <output id="flux-shape-label">圆球</output></label><input id="flux-shape" type="range" min="1.1" max="3.3" step="0.02" value="2.1"><div class="range-ends"><span>压扁</span><span>拉长</span></div></div>
        </div>
        <div id="flux-challenge-controls" class="flux-challenge-controls" hidden>
          <p>内部暂时隐藏。只看包围面上的电场，能否判断里面的<strong>净电荷</strong>？</p>
          <div class="flux-challenge-actions"><button id="flux-measure" class="primary">① 测净通量</button><button id="flux-reveal" disabled>② 揭晓内部</button></div>
          <div id="flux-inference" class="flux-inference" hidden></div>
          <button id="flux-new-mystery" class="text-button">换一组未知电荷</button>
          <button id="flux-exit-mystery" class="text-button">返回观察</button>
        </div>
        <div class="flux-patch-card" id="flux-patch-card" hidden>
          <div class="flux-small-label">黄色框选中的这一片</div><strong id="flux-patch-direction">—</strong>
          <p id="flux-patch-explain"></p>
          <div class="flux-vector-key"><span><i style="background:#087e8b"></i>E：电场方向</span><span><i style="background:#7860a2"></i>n：面朝外的方向</span></div>
        </div>
        <div class="flux-total-card" id="flux-total-card" hidden>
          <div class="flux-small-label">把整个闭合面上的贡献加起来</div>
          <div class="flux-sum"><span class="flux-out" id="flux-outward">0</span><span>+</span><span class="flux-in" id="flux-inward">0</span><span>=</span><strong id="flux-total">0</strong></div>
          <div class="flux-sum-labels"><span>所有正贡献</span><span>所有负贡献</span><span>总通量</span></div>
          <div class="flux-charge-meter" id="flux-charge-meter"><div><span>包住的电荷</span><strong id="flux-enclosed">0%</strong></div><div class="flux-meter-track"><div id="flux-meter-fill"></div></div></div>
          <p id="flux-unit-note">通量以 Q₀/ε₀ 为 1 个单位。不是数亮点，数值由电场与面积相加得到。</p>
        </div>
        <div class="status" id="flux-status" aria-live="polite"></div>
        <button class="flux-next primary" id="flux-next">下一步：移入电荷 →</button>
        <button class="text-button flux-reset" id="flux-reset">重看这一步</button>
      </aside>
    </div>
    <section class="flux-purpose"><div><span class="flux-section-number">测通量，能解决什么？</span><h3>从外面的整体电场，推断里面的净电荷。</h3><p>不必先找出内部每颗电荷的位置。测量完整包围面上的电场，把正负贡献相加，就能推断内部净电荷。试一次模拟测量，再揭开内部。</p></div><button id="flux-start-mystery">测净电荷</button></section>
    <div class="flux-explain-grid">
      <section class="flux-explain"><span class="flux-section-number">先理解这个词</span><h3>“通量”在描述什么？</h3><p>在一小片面上，取<strong>垂直穿过这片面的电场分量</strong>，再乘<strong>这片面积</strong>。向外记正，向内记负，沿着面则记零。</p><div class="flux-word-equation">这一片的贡献 = 垂直分量 × 面积</div><p class="flux-fine">短箭头是方向标记，亮点是场线与包围面的交点；都不是电子流。场线经过有限挑选，<strong>线和亮点的数量不能代替精确积分</strong>。面片颜色表示垂直分量的大小。</p></section>
      <section class="flux-explain" id="flux-law-intro"><span class="flux-section-number">先看现象，再看公式</span><h3>一个闭合面，为什么要看全部小片？</h3><p>闭合面像完整的气球皮，包住一块空间；<strong>切片只是一张平面</strong>。只看一片，可能看见穿入；把整个包围面都加上，才知道穿入与穿出是否抵消。</p><p id="flux-summary">下一步把电荷移进去，观察“包住多少电荷”与“总通量”之间的关系。</p></section>
    </div>
    <details class="learning flux-advanced">
      <summary>说明</summary>
      <div class="flux-formula-map"><div><span>每一小片</span><strong>ΔΦ ≈ (E · n) ΔA</strong><p>E 是此处电场；n 是该面片向外的单位方向。点乘只留下垂直分量。对有限大小的面片，这是小面片近似。</p></div><div><span>整个闭合面</span><strong>Φ = ∮<sub>S</sub> E · n dA = Q<sub>内</sub> / ε₀</strong><p>∮ 表示沿完整闭合面，把无限小面片的贡献相加；不是沿边缘走一圈，也不是把一个平面截面积相加。</p></div></div>
      <p><strong>等号两边分别是什么？</strong>左边是表面上电场贡献的总和；右边是这个面包住的净电荷除以真空介电常数 ε₀。外部电荷会改变表面各处的电场，却不改变这个总和。</p>
      <div id="flux-numerics" class="flux-numerics"></div>
      <p><strong>模型与适用范围：</strong>红球是半径 0.42 mm、总电荷为 ±Q₀，Q₀ = 0.10 pC 的均匀带电绝缘实心球；移动是在比较一组静电状态。“移动电荷”中的包围面是半径 2.10 mm 的球，穿越时按两球相交体积计算内部电荷，“改变形状”中电荷固定中央，包围面改变为椭球。测量挑战会切换正电荷、负电荷和等量异号电荷；隐藏内部只改变显示，不改变电场计算。表面取样独立计算积分，因此有离散误差。高斯定理对任意闭合面成立；要用它直接求某处 E，通常还需要足够的对称性。</p>
      <p>面片颜色固定以 |E·n| = 500 V/m 为满刻度，超出后饱和；改变形状不自动换色标。<a href="https://openstax.org/books/university-physics-volume-2/pages/6-3-applying-gausss-law" target="_blank" rel="noopener">教材依据：高斯定理与对称性 ↗</a></p>
    </details>
  </div>`;

  // Keep explanations available while giving the model and controls the main space.
  const explanation = container.querySelector('.flux-advanced');
  const extra = document.createElement('div'); extra.className = 'flux-extra-notes';
  for (const selector of ['#flux-step-label','#flux-step-title','#flux-step-text','#flux-status','.flux-explain-grid','.flux-purpose>div','#flux-unit-note']) {
    const node=container.querySelector(selector); if(node) extra.append(node);
  }
  explanation.append(extra);
  const $ = selector => container.querySelector(selector);
  const goalPanel=document.createElement('div');goalPanel.className='flux-goal';goalPanel.innerHTML=`<button id="flux-goal-start">◎ 让它一进一出</button><div class="flux-goal-task" hidden><strong>让同一条场线一进一出</strong><div class="flux-goal-feedback"><i aria-hidden="true"></i><span id="flux-goal-status" role="status" aria-live="polite">拖动红球</span><span id="flux-goal-check" hidden>✓</span></div><div class="flux-goal-actions"><button id="flux-goal-again" hidden>再试一次</button><button id="flux-goal-exit">自由探索</button></div></div>`;$('.stage-wrap').append(goalPanel);
  const scene = new FieldScene($('.stage'), { extent: 6 });
  // A narrow screen needs a wider field of view so the external source stays visible.
  const fitViewport = () => { scene.camera.fov = $('.stage').clientWidth < 600 ? 52 : 38; scene.camera.updateProjectionMatrix(); };
  const viewportObserver = new ResizeObserver(fitViewport); viewportObserver.observe($('.stage')); fitViewport();
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { step: 2, x: -3.7, sign: 1, a: R, surfaceVisible: true, flowMoving: !motionPreference.matches, challenge: false, mystery: 0, measured: false, revealed: false };
  let source, sources, selected = { u: 1 / NU, phi: Math.PI + Math.PI / NP };
  let pending = 0, playFrame = 0, disposed = false, playing = false;
  let flowGlyphs = [], flowTime = 0, previousTime = 0, measuredTotal = 0;
  let goalActive=false,goalSnapshot=null,goalEvaluation=null,goalHeldMs=0,goalCompleted=false,goalSuccessAt=-Infinity;
  const goalHalo=scene.line(Array.from({length:97},(_,i)=>[R*1.018*Math.cos(i*Math.PI/48),R*1.018*Math.sin(i*Math.PI/48),0]),'#96e8c6','flux-goal-halo',.4);goalHalo.material.depthTest=false;goalHalo.renderOrder=24;goalHalo.visible=false;
  function goalControls(active){
    $('.flux-experience').classList.toggle('flux-goal-active',active);$('#flux-goal-start').hidden=active;$('.flux-goal-task').hidden=!active;
    container.querySelectorAll('[data-flux-placement],[data-flux-sign],[data-flux-step],#flux-play,#flux-reset,#flux-start-mystery').forEach(el=>el.disabled=active);
  }
  function startGoal(){
    if(!goalSnapshot)goalSnapshot={state:{...state},selected:{...selected},camera:scene.camera.position.clone(),up:scene.camera.up.clone(),target:scene.controls.target.clone(),view:container.querySelector('[data-flux-view].active')?.dataset.fluxView};
    stopPlay();cancelAnimationFrame(pending);setStep(2);goalActive=true;goalEvaluation=null;goalHeldMs=0;goalCompleted=false;goalSuccessAt=-Infinity;goalHalo.visible=false;
    Object.assign(state,{x:0,sign:1,challenge:false,surfaceVisible:true,a:R});$('#flux-source-x').value=0;
    container.querySelectorAll('[data-flux-sign]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.fluxSign==='1')));
    goalControls(true);scene.cameraMove=null;setView('front',false);rebuild();
  }
  function exitGoal(){
    goalActive=false;goalEvaluation=null;goalHeldMs=0;goalCompleted=false;goalHalo.visible=false;goalControls(false);
    if(goalSnapshot){const saved=goalSnapshot;goalSnapshot=null;setStep(saved.state.step);if(saved.state.challenge)startMystery();Object.assign(state,saved.state);selected={...saved.selected};$('#flux-source-x').value=state.x;$('#flux-shape').value=state.a;$('#flux-shape-label').textContent=Math.abs(state.a-R)<.08?'接近圆球':state.a<R?'左右压扁':'左右拉长';container.querySelectorAll('[data-flux-sign]').forEach(el=>el.setAttribute('aria-pressed',String(+el.dataset.fluxSign===state.sign)));scene.cameraMove=null;scene.camera.position.copy(saved.camera);scene.camera.up.copy(saved.up);scene.controls.target.copy(saved.target);scene.controls.enabled=true;scene.controls.update();container.querySelectorAll('[data-flux-view]').forEach(el=>el.classList.toggle('active',el.dataset.fluxView===saved.view));rebuild();}
    for(const el of [container,$('.stage')]){el.dataset.fluxGoal='';el.dataset.fluxGoalMatched='false';el.dataset.fluxGoalCompleted='false';el.dataset.fluxGoalHold='0';}
  }
  function tickGoal(elapsed,time){
    if(!goalActive||!goalEvaluation)return;
    const matched=goalEvaluation.matched;goalHeldMs=matched?Math.min(600,goalHeldMs+elapsed*1000):0;
    if(goalHeldMs>=600&&!goalCompleted){goalCompleted=true;goalSuccessAt=time;}
    goalPanel.classList.toggle('is-matched',matched);goalPanel.style.setProperty('--hold',goalHeldMs/600);$('#flux-goal-check').hidden=!goalCompleted;$('#flux-goal-again').hidden=!goalCompleted;
    const status=matched?(goalHeldMs>=600?'一进一出 · 净通量 0':'停在这里'):goalEvaluation.entersThenExits?'继续向外拖':'拖动红球';if($('#flux-goal-status').textContent!==status)$('#flux-goal-status').textContent=status;
    const pulse=!motionPreference.matches&&time-goalSuccessAt<1200?Math.sin(Math.PI*(time-goalSuccessAt)/600)**2:0;goalHalo.visible=matched;goalHalo.quaternion.copy(scene.camera.quaternion);goalHalo.material.opacity=.16+.54*pulse;goalHalo.scale.setScalar(1+.012*pulse);
    for(const child of scene.layer('flux-line').children)if(child.userData.crossing)child.scale.setScalar(1+.15*pulse);
    for(const el of [container,$('.stage')]){el.dataset.fluxGoal='one-in-one-out';el.dataset.fluxGoalMatched=String(matched);el.dataset.fluxGoalCompleted=String(goalCompleted);el.dataset.fluxGoalHold=String(Math.round(goalHeldMs));}
  }
  $('#flux-goal-start').onclick=startGoal;$('#flux-goal-again').onclick=startGoal;$('#flux-goal-exit').onclick=exitGoal;
  const point = (u, phi) => { const radial = Math.sqrt(Math.max(0, 1 - u * u)); return [state.a * radial * Math.cos(phi), R * u, R * radial * Math.sin(phi)]; };
  const geometryAt = (u, phi) => {
    const radial = Math.sqrt(Math.max(0, 1 - u * u));
    const areaVector = [R * R * radial * Math.cos(phi), state.a * R * u, state.a * R * radial * Math.sin(phi)];
    const magnitude = norm(areaVector);
    return { pos: point(u, phi), normal: areaVector.map(x => x / magnitude), magnitude };
  };
  const patchAt = (u, phi, du = 2 / NU, dphi = 2 * Math.PI / NP) => {
    const patch = geometryAt(u, phi); const E = fieldAt(patch.pos, sources).E;
    const En = E.reduce((sum, value, index) => sum + value * patch.normal[index], 0);
    return { ...patch, E, En, area: patch.magnitude * du * dphi * 1e-6, contribution: En * patch.magnitude * du * dphi * 1e-6, u, phi };
  };
  function setView(mode, smooth = true) {
    scene.controls.minDistance = 5;
    const focusX = state.surfaceVisible ? 0 : state.x;
    const position = mode === 'front' ? [focusX, 0, 12] : mode === 'top' ? [focusX, 12, 0.001] : [focusX - 6.5, 4.5, 10.7];
    scene.controls.target.set(focusX, 0, 0);
    if (!smooth || matchMedia('(prefers-reduced-motion: reduce)').matches) { scene.camera.position.set(...position); scene.controls.update(); }
    else { scene.cameraMove = { from: scene.camera.position.clone(), to: new THREE.Vector3(...position), start: performance.now() }; scene.controls.enabled = false; }
    container.querySelectorAll('[data-flux-view]').forEach(button => button.classList.toggle('active', button.dataset.fluxView === mode));
  }
  function visibleArrow(pos, direction, color, length, layer) {
    const arrow = scene.arrow(pos, direction, color, length, layer);
    arrow?.traverse(object => { if (object.material) { object.material.depthTest = false; object.material.depthWrite = false; object.material.transparent = true; object.renderOrder = 15; } });
  }
  function showPatch() {
    const patch = patchAt(selected.u, selected.phi); scene.clearLayer('selected');
    const corners = [point(selected.u - 1 / NU, selected.phi - Math.PI / NP), point(selected.u + 1 / NU, selected.phi - Math.PI / NP), point(selected.u + 1 / NU, selected.phi + Math.PI / NP), point(selected.u - 1 / NU, selected.phi + Math.PI / NP)];
    const border = scene.line([...corners, corners[0]], '#d59a16', 'selected'); border.material.depthTest = false; border.material.transparent = true; border.renderOrder = 16;
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), new THREE.MeshBasicMaterial({ color: '#e6ad28', depthTest: false, transparent: true })); marker.position.set(...patch.pos); marker.renderOrder = 18; scene.layer('selected').add(marker);
    visibleArrow(patch.pos, patch.E, '#62e5e0', 1.0, 'selected'); visibleArrow(patch.pos, patch.normal, '#c4a1ff', 0.66, 'selected');
    const eLength = norm(patch.E) || 1;
    const eEnd = patch.pos.map((value, index) => value + patch.E[index] / eLength * 1.22);
    const nEnd = patch.pos.map((value, index) => value + patch.normal[index] * 0.93);
    // Offset labels when E and n happen to be parallel.
    eEnd[1] += 0.2; nEnd[1] -= 0.2;
    scene.label('E', eEnd, '#62e5e0', 'selected', 0.6).renderOrder = 25;
    scene.label('n', nEnd, '#c4a1ff', 'selected', 0.55).renderOrder = 25;
    const sign = patch.En > 0.01 ? 'out' : patch.En < -0.01 ? 'in' : 'zero';
    $('#flux-patch-direction').className = `flux-${sign}`;
    $('#flux-patch-direction').textContent = sign === 'out' ? '向外穿过 → 记正贡献' : sign === 'in' ? '向内穿过 → 记负贡献' : '沿着这一片 → 贡献为零';
    $('#flux-patch-explain').textContent = sign === 'out' ? '青色 E 朝向这一片的外侧。与紫色 n 同侧的部分，计入正值。' : sign === 'in' ? '青色 E 指向这一片的内侧。与紫色 n 反向的部分，计入负值。' : '电场没有垂直穿过这片面，因此这一片不贡献通量。';
    container.querySelectorAll('[data-flux-patch]').forEach(button => button.classList.toggle('active', button.dataset.fluxPatch === (Math.cos(selected.phi) < 0 ? 'left' : 'right')));
    const details = $('#flux-numerics');
    if (details.dataset.total) details.innerHTML = `${details.dataset.total}<br>选中面片：E·n = ${clean(patch.En, 2)} V/m；ΔA ≈ ${patch.area.toExponential(3)} m²；ΔΦ ≈ ${patch.contribution.toExponential(3)} V·m。`;
    scene.layer('selected').visible = state.surfaceVisible;
  }
  function surface() {
    scene.clearLayer('surface'); scene.clearLayer('wire'); scene.clearLayer('surface-arrows');
    const vertices = [], colors = [], patchCenters = [];
    for (let j = 0; j < NU; j++) for (let i = 0; i < NP; i++) {
      const u0 = -1 + j * 2 / NU, u1 = -1 + (j + 1) * 2 / NU, phi0 = i * 2 * Math.PI / NP, phi1 = (i + 1) * 2 * Math.PI / NP;
      const patch = patchAt((u0 + u1) / 2, (phi0 + phi1) / 2); patchCenters.push({ u: patch.u, phi: patch.phi });
      const color = new THREE.Color('#17394e').lerp(new THREE.Color(patch.En >= 0 ? '#f2ad5e' : '#65c3f3'), Math.pow(Math.min(1, Math.abs(patch.En) / 500), 0.45));
      const corners = [point(u0, phi0), point(u1, phi0), point(u1, phi1), point(u0, phi1)];
      for (const index of [0, 1, 2, 0, 2, 3]) { vertices.push(...corners[index]); colors.push(color.r, color.g, color.b); }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    mesh.userData = { pickable: true, fluxSurface: true, patchCenters }; scene.layer('surface').add(mesh);
    for (const u of [-0.75, -0.4, 0, 0.4, 0.75]) scene.line(Array.from({ length: 73 }, (_, i) => point(u, i * 2 * Math.PI / 72)), '#7295ad', 'wire', 0.28);
    for (let i = 0; i < 12; i++) scene.line(Array.from({ length: 73 }, (_, j) => point(-1 + 2 * j / 72, i * 2 * Math.PI / 12)), '#7295ad', 'wire', 0.26);
    for (const u of [-0.55, 0, 0.55]) for (let i = 0; i < 8; i++) {
      const patch = patchAt(u, i * Math.PI / 4 + 0.12);
      scene.arrow(patch.pos, patch.E, patch.En >= 0 ? '#ffc477' : '#76d3ff', 0.43, 'surface-arrows');
    }
    for (const name of ['surface', 'wire']) scene.layer(name).visible = state.surfaceVisible;scene.layer('surface-arrows').visible=false;
  }

  function buildFieldFlow() {
    scene.clearLayer('field-flow'); scene.clearLayer('field-crossings'); scene.clearLayer('field-glyphs'); flowGlyphs = [];
    if (state.challenge) { updateMotionButton(); return; }
    const directions = [];
    const count = 24;
    for (let i = 0; i < count; i++) {
      const u = 1 - 2 * (i + 0.5) / count, angle = i * Math.PI * (3 - Math.sqrt(5)), radial = Math.sqrt(1 - u * u);
      directions.push([radial * Math.cos(angle), u, radial * Math.sin(angle)]);
    }
    directions.forEach((direction, index) => {
      const start = SOURCE_RADIUS + 0.025;
      let end = state.surfaceVisible ? 8 : 2.7;
      if (state.surfaceVisible) {
        for (let axis = 0; axis < 3; axis++) {
          if (Math.abs(direction[axis]) < 1e-10) continue;
          const limits = axis === 0 ? [-5.2, 4.5] : [-3.15, 3.15];
          const bound = direction[axis] > 0 ? limits[1] : limits[0];
          end = Math.min(end, (bound - source.pos[axis]) / direction[axis]);
        }
      }
      if (end <= start + 0.12) return;
      const along = distance => source.pos.map((value, axis) => value + direction[axis] * distance);
      scene.line([along(start), along(end)], state.sign>0?'#f0ac71':'#78cbef', 'field-flow', 0.11);
      for (let markerIndex = 0; markerIndex < 2; markerIndex++) {
        const glyph = new THREE.Mesh(new THREE.ConeGeometry(0.043, 0.14, 5), new THREE.MeshBasicMaterial({ color: '#ffd094', transparent: true, opacity: 0.23, depthWrite: false }));
        glyph.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...direction.map(v=>v*state.sign)));
        const offset = (index * 0.173 + markerIndex * 0.5) % 1;
        glyph.position.set(...along(start + offset * (end - start))); scene.layer('field-glyphs').add(glyph);
        flowGlyphs.push({ glyph, along, start, end, offset });
      }
    });
    updateMotionButton();
  }
  function buildSelectedLine(fraction,total){
    scene.clearLayer('flux-line');
    $('.flux-line-readout').hidden=state.challenge;
    $('#flux-drag-hint').textContent=state.step===3?'形状对照：电荷固定在中央':state.sign>0?'拖动红球，沿水平移入或移出':'拖动蓝球，沿水平移入或移出';
    if(state.challenge)return;
    const plan=buildFluxLine(source.pos,SOURCE_RADIUS,[state.a,R,R],state.sign),at=t=>plan.origin.map((value,i)=>value+plan.direction[i]*t);
    const line=scene.line([at(plan.start),at(plan.end)],'#fff0bc','flux-line',1);line.material.depthTest=false;line.renderOrder=22;
    const direction=plan.direction.map(value=>value*state.sign);
    for(const f of [.18,.45,.73])visibleArrow(at(plan.start+(plan.end-plan.start)*f),direction,'#ffe0a0',.29,'flux-line');
    for(const hit of plan.crossings){
      const color=hit.sign<0?'#7cdbff':'#ffd07b';
      const marker=new THREE.Mesh(new THREE.SphereGeometry(.105,18,12),new THREE.MeshBasicMaterial({color,depthTest:false}));marker.position.set(...hit.point);marker.renderOrder=25;marker.userData={pickable:true,crossing:true,point:hit.point,sign:hit.sign};scene.layer('flux-line').add(marker);
      scene.label(hit.sign<0?'穿入 −':'穿出 +',[hit.point[0],hit.point[1]+.4,hit.point[2]],color,'flux-line',.3).renderOrder=26;
    }
    const signs=plan.crossings.map(hit=>hit.sign);
    if(goalActive)goalEvaluation=evaluateFluxGoal({line:plan,enclosedFraction:fraction,normalizedFlux:total/UNIT});
    $('#flux-line-summary').textContent=signs.length===2?'同一条场线：一处穿入 −，一处穿出 +':state.sign>0?'内部正电荷：向外穿出 +':'内部负电荷：向内穿入 −';
    $('#flux-line-note').textContent=fraction===0?'外部源：整个面的正负贡献抵消，净通量为 0':fraction===1?`内部净电荷 ${state.sign>0?'+':'−'}Q₀，净通量 ${state.sign>0?'+':'−'}Q₀/ε₀`:'电荷球正在跨界，净通量随包入电荷连续改变';
    $('.stage').dataset.sourceX=String(state.x);$('.stage').dataset.lineCrossings=JSON.stringify(signs);$('.stage').dataset.flux=String(total/UNIT);
    const screen=new THREE.Vector3(...source.pos).project(scene.camera),rect=scene.renderer.domElement.getBoundingClientRect();
    if(rect){$('.stage').dataset.sourceScreen=JSON.stringify([rect.left+(screen.x+1)*rect.width/2,rect.top+(1-screen.y)*rect.height/2]);}
  }
  function updateMotionButton() {
    $('#flux-flow-toggle').textContent = state.challenge ? '测量时显示静态方向' : state.flowMoving ? '暂停方向标记' : '播放方向标记';
    $('#flux-flow-toggle').setAttribute('aria-pressed', String(!state.challenge && state.flowMoving));
    $('#flux-flow-toggle').disabled = state.challenge;
    $('.stage').dataset.directionMarkers = String(flowGlyphs.length);
    $('.stage').dataset.surfaceCrossings = String(scene.layer('field-crossings').children.length);
  }
  scene.frameFn = time => {
    const elapsed = previousTime ? Math.min(0.08, (time - previousTime) / 1000) : 0; previousTime = time;
    if(source){const p=new THREE.Vector3(...source.pos).project(scene.camera),rect=scene.renderer.domElement.getBoundingClientRect();$('.stage').dataset.sourceScreen=JSON.stringify([rect.left+(p.x+1)*rect.width/2,rect.top+(1-p.y)*rect.height/2]);}
    tickGoal(elapsed,time);
    if (!state.flowMoving || state.challenge) return;
    flowTime += elapsed;
    for (const item of flowGlyphs) {
      const raw = (flowTime * 0.17 + item.offset) % 1, phase = state.sign>0?raw:1-raw;
      item.glyph.position.set(...item.along(item.start + phase * (item.end - item.start)));
    }
    $('.stage').dataset.directionPhase = String(flowTime);
  };
  function integrateSigns() {
    let positive = 0, negative = 0;
    const nu = 96, np = 192, du = 2 / nu, dphi = 2 * Math.PI / np;
    for (let j = 0; j < nu; j++) for (let i = 0; i < np; i++) {
      const contribution = patchAt(-1 + (j + 0.5) * du, (i + 0.5) * dphi, du, dphi).contribution;
      if (contribution >= 0) positive += contribution; else negative += contribution;
    }
    return { positive, negative };
  }
  function rebuild() {
    if (disposed) return;
    scene.clearLayer('charges'); scene.clearLayer('source-guide'); scene.clearLayer('mystery');
    source = { id: 'Q', label: 'Q₀', pos: [state.x, 0, 0], radius: SOURCE_RADIUS, Q: Q0 * state.sign }; scene.charge(source);
    sources = [source];
    if (state.challenge) {
      sources = MYSTERIES[state.mystery].sources.map((item, index) => ({ ...item, radius: SOURCE_RADIUS, id: `hidden-${index}`, label: 'Q₀' }));
      scene.clearLayer('charges');
      if (state.revealed) sources.forEach(item => scene.charge(item));
      else scene.label('内部暂时隐藏', [0, 0, 0], '#a7c9dc', 'mystery', 0.43).renderOrder = 25;
    }
    scene.layer('charges').traverse(object => { if (object.isSprite) { object.renderOrder = 25; object.scale.multiplyScalar(1.4); } });
    // Chosen parameter path, not a field line or a particle trajectory.
    if (state.step === 2 && !state.challenge) {
      const guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3.7, -0.65, 0), new THREE.Vector3(3.7, -0.65, 0)]), new THREE.LineDashedMaterial({ color: '#61859c', dashSize: 0.09, gapSize: 0.07 })); guide.computeLineDistances(); scene.layer('source-guide').add(guide);
    }
    surface();
    buildFieldFlow();
    const fraction = state.step === 3 ? 1 : enclosedSphereFraction(R, SOURCE_RADIUS, Math.abs(state.x));
    const total = gaussianFlux([0, 0, 0], [state.a, R, R], sources, 96, 192); measuredTotal = total;
    const { positive, negative } = integrateSigns();
    $('#flux-total').textContent = clean(total / UNIT); $('#flux-total').dataset.value = String(total / UNIT);
    $('#flux-outward').textContent = `+${clean(positive / UNIT)}`; $('#flux-inward').textContent = clean(negative / UNIT);
    $('#flux-enclosed').textContent = `${state.sign>0?'+':'−'}${clean(fraction * 100, 0)}% Q₀`; $('#flux-enclosed').dataset.fraction = String(fraction); $('#flux-meter-fill').style.width = `${fraction * 100}%`;
    const location = fraction === 0 ? '完全在外面' : fraction === 1 ? '完全在里面' : '正在穿过包围面'; $('#flux-source-label').textContent = location;
    $('#flux-scene-title').textContent = state.surfaceVisible ? '场线在哪里穿过包围面？' : '先看电场朝哪里';
    $('#flux-scene-pill').textContent = '所选场线 · 交点不等于通量计数';
    $('#flux-surface-note').textContent = state.surfaceVisible ? '可点亮点或表面 · 假想面不挡场' : '拖动旋转 · 电场向四周指向外';
    $('#flux-crossing-key').hidden = !state.surfaceVisible;
    $('#flux-patch-card').hidden = true;scene.layer('selected').visible=false;
    $('#flux-scene-note').textContent = !state.surfaceVisible ? '正电荷的电场向外；沿短箭头看方向。' : state.step === 3 ? '形状在变，包住的电荷没有变。' : fraction === 0 ? '沿同一条线看：先蓝点穿入，再橙点穿出。' : fraction === 1 ? '电荷在里面；场线从里面向外穿出。' : `红球逐渐进入：现在包住 ${clean(fraction * 100, 0)}% 的电荷。`;
    $('#flux-status').textContent = state.step === 1 ? state.surfaceVisible ? '选一条确实穿过这个面的线：先穿入，再穿出。另一些场线完全不经过这个面。看一对蓝、橙交点，再比较两片。' : '先看方向，再加上包围面。这个面只是我们选择的测量边界，不是实体外壳。' : state.step === 3 ? `包住的电荷始终为 ${state.sign>0?'+':'−'}Q₀，总通量始终约为 ${state.sign}。局部变了，总和没有变。` : fraction === 0 ? '包住 0% 电荷 → 总通量约为 0。正负抵消，不代表表面没有电场。' : fraction === 1 ? `包住全部电荷 → 总通量约为 ${state.sign}。电荷球继续在内部移动，总和仍不变。` : `包住 ${clean(fraction * 100, 0)}% 电荷 → 总通量约为 ${clean(total / UNIT)}。假想面不会挡住红球。`;
    $('#flux-summary').textContent = state.step === 1 ? '下一步把电荷移进去，观察“包住多少电荷”与“总通量”之间的关系。' : '这里的高斯定理说：完整闭合面的总通量，等于它包住的净电荷除以 ε₀。它给的是整个面的总和，不能单凭总和判断某个位置的场强。';
    const expected = state.challenge ? MYSTERIES[state.mystery].net * UNIT : fraction * UNIT * state.sign;
    $('#flux-numerics').dataset.total = `表面积分：${total.toExponential(5)} V·m；Q内/ε₀：${expected.toExponential(5)} V·m；两者差：${Math.abs(total - expected).toExponential(2)} V·m。`;
    showPatch();scene.layer('selected').visible=false;
    buildSelectedLine(fraction,total);
    if (state.challenge) updateMystery();
  }
  function stopPlay() { cancelAnimationFrame(playFrame); playing = false; $('#flux-play').textContent = '看它移进去'; }
  function schedule() { cancelAnimationFrame(pending); pending = requestAnimationFrame(rebuild); }
  function setStep(step) {
    stopPlay(); state.challenge = false; state.step = step; state.x = step === 3 ? 0 : -3.7; state.a = R; state.surfaceVisible = true;
    selected = { u: 1 / NU, phi: Math.PI + Math.PI / NP };
    const copy = STEPS[step - 1]; $('#flux-step-label').textContent = `第 ${step} 步 / 共 3 步`; $('#flux-step-title').textContent = copy.title; $('#flux-step-text').textContent = copy.text;
    $('#flux-add-surface').hidden = step !== 1; $('#flux-add-surface').textContent = '显示包围面';
    $('#flux-patch-controls').hidden = true; $('#flux-move-controls').hidden = step !== 2; $('#flux-shape-controls').hidden = step !== 3; $('#flux-total-card').hidden = step === 1;
    $('#flux-challenge-controls').hidden = true; $('#flux-charge-meter').hidden = false; $('.flux-advanced').hidden = false; $('#flux-reset').hidden = false;
    $('#flux-unit-note').textContent = '通量以 Q₀/ε₀ 为 1 个单位。不是数亮点，数值由电场与面积相加得到。';
    $('#flux-source-x').value = state.x; $('#flux-shape').value = state.a; $('#flux-shape-label').textContent = '圆球';
    $('#flux-next').hidden = true; $('#flux-next').textContent = step === 1 ? '下一步：移入电荷 →' : '下一步：改变外形 →';
    container.querySelectorAll('[data-flux-step]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.fluxStep) === step)));
    rebuild(); setView('front');
  }
  function updateMystery() {
    $('#flux-scene-title').textContent = '只从外面测量，推断内部';
    $('#flux-scene-pill').textContent = '模拟测量 · 逐片加权求和';
    $('#flux-scene-note').textContent = state.revealed ? '内部已揭晓；比较测量结果和真实电荷。' : '内部隐藏，表面电场仍然可以观察和测量。';
    $('#flux-total-card').hidden = !state.measured;
    $('#flux-charge-meter').hidden = true;
    $('#flux-inference').hidden = !state.measured;
    $('#flux-reveal').disabled = !state.measured || state.revealed;
    $('.flux-advanced').hidden = !state.measured;
    $('#flux-measure').textContent = state.measured ? '已测量 · 可再测一次' : '① 测净通量';
    $('#flux-unit-note').textContent = '通量以 Q₀/ε₀ 为单位。Q₀ = 0.10 pC 是本次的电荷标尺。';
    const normalized = measuredTotal / UNIT;
    const inferred = Math.abs(normalized) < 0.005 ? '0' : `${normalized > 0 ? '+' : '−'}${clean(Math.abs(normalized))} Q₀`;
    $('#flux-inference').innerHTML = `<span>由 Q<sub>内</sub> = ε₀ Φ 推断</span><strong>内部净电荷 ≈ ${inferred}</strong><p>${state.revealed ? MYSTERIES[state.mystery].reveal : '现在可以揭晓内部，检验这次推断。总通量能告诉我们净电荷，但不能唯一确定它们的位置。'}</p>`;
    $('#flux-status').textContent = state.revealed ? MYSTERIES[state.mystery].reveal : state.measured ? '测量已完成。结果来自整个面上的电场积分，不是场线或亮点的数量。' : '内部暂时隐藏。测得整个闭合面的净通量，就能推断里面的净电荷。';
    $('#flux-surface-note').textContent = '隐藏仅影响显示 · 电场仍由真实源计算';
  }
  function startMystery(next = false) {
    stopPlay();
    if (next) state.mystery = (state.mystery + 1) % MYSTERIES.length;
    Object.assign(state, { challenge: true, surfaceVisible: true, measured: false, revealed: false, a: R, x: 0 });
    $('#flux-step-label').textContent = '模拟测量挑战'; $('#flux-step-title').textContent = '不看里面，测出净电荷'; $('#flux-step-text').textContent = '不用知道每颗电荷的位置，也可以从外面的整体电场推断内部总量。';
    for (const id of ['flux-add-surface', 'flux-patch-controls', 'flux-move-controls', 'flux-shape-controls', 'flux-next', 'flux-reset']) $(`#${id}`).hidden = true;
    $('#flux-challenge-controls').hidden = false;
    container.querySelectorAll('[data-flux-step]').forEach(button => button.setAttribute('aria-pressed', 'false'));
    rebuild(); setView('front');
    $('.flux-steps').scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  container.querySelectorAll('[data-flux-step]').forEach(button => button.addEventListener('click', () => setStep(Number(button.dataset.fluxStep))));
  container.querySelectorAll('[data-flux-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.fluxView)));
  container.querySelectorAll('[data-flux-patch]').forEach(button => button.addEventListener('click', () => { selected = { u: 1 / NU, phi: button.dataset.fluxPatch === 'left' ? Math.PI + Math.PI / NP : Math.PI / NP }; showPatch(); }));
  scene.onPick((_, object, hit) => {
    if (!state.surfaceVisible) return;
    if (object?.userData.fluxSurface) { selected = object.userData.patchCenters[Math.floor(hit.faceIndex / 2)]; showPatch(); }
    else if (object?.userData.crossing) {
      const point = object.userData.point, uIndex = Math.min(NU - 1, Math.max(0, Math.floor((point[1] / R + 1) * NU / 2)));
      const phi = (Math.atan2(point[2] / R, point[0] / state.a) + 2 * Math.PI) % (2 * Math.PI);
      selected = { u: -1 + (uIndex + 0.5) * 2 / NU, phi: (Math.floor(phi * NP / (2 * Math.PI)) + 0.5) * 2 * Math.PI / NP }; showPatch();
    }
  });
  $('#flux-add-surface').addEventListener('click', () => {
    state.surfaceVisible = !state.surfaceVisible;
    $('#flux-add-surface').textContent = state.surfaceVisible ? '暂时隐藏包围面' : '显示包围面';
    $('#flux-patch-controls').hidden = !state.surfaceVisible;
    rebuild(); setView('front');
  });
  $('#flux-flow-toggle').addEventListener('click', () => { state.flowMoving = !state.flowMoving; updateMotionButton(); });
  const motionChanged = event => { if (event.matches) { state.flowMoving = false; stopPlay(); updateMotionButton(); } };
  motionPreference.addEventListener('change', motionChanged);
  $('#flux-start-mystery').addEventListener('click', () => startMystery());
  $('#flux-new-mystery').addEventListener('click', () => startMystery(true));
  $('#flux-exit-mystery').addEventListener('click', () => setStep(2));
  $('#flux-measure').addEventListener('click', () => { state.measured = true; updateMystery(); });
  $('#flux-reveal').addEventListener('click', () => { state.revealed = true; rebuild(); });
  $('#flux-source-x').addEventListener('input', () => { stopPlay(); state.x = Number($('#flux-source-x').value); schedule(); });
  $('#flux-shape').addEventListener('input', () => { state.a = Number($('#flux-shape').value); $('#flux-shape-label').textContent = Math.abs(state.a - R) < 0.08 ? '接近圆球' : state.a < R ? '左右压扁' : '左右拉长'; schedule(); });
  $('#flux-play').addEventListener('click', () => {
    if (playing) { stopPlay(); return; }
    state.x = -3.7; playing = true; $('#flux-play').textContent = '暂停'; const start = performance.now(); let previous = -Infinity;
    const animate = now => {
      if (disposed || !playing) return;
      const t = Math.min(1, (now - start) / 5000); state.x = -3.7 * (1 - t); $('#flux-source-x').value = state.x;
      if (now - previous > 50 || t === 1) { rebuild(); previous = now; }
      if (t < 1) playFrame = requestAnimationFrame(animate); else stopPlay();
    };
    playFrame = requestAnimationFrame(animate);
  });
  $('#flux-next').addEventListener('click', () => setStep(Math.min(3, state.step + 1)));
  $('#flux-reset').addEventListener('click', () => { setView('iso'); setStep(state.step); });
  container.querySelectorAll('[data-flux-placement]').forEach(button=>button.addEventListener('click',()=>{setStep(2);state.x=button.dataset.fluxPlacement==='inside'?0:-3.7;$('#flux-source-x').value=state.x;rebuild();}));
  container.querySelectorAll('[data-flux-sign]').forEach(button=>button.addEventListener('click',()=>{state.sign=Number(button.dataset.fluxSign);container.querySelectorAll('[data-flux-sign]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));rebuild();}));
  const canvas=scene.renderer.domElement, dragRay=new THREE.Raycaster(), dragPlane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
  let draggingSource=false,dragOffset=0,lastDragRebuild=0;
  function pointerRay(event){const rect=canvas.getBoundingClientRect();dragRay.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),scene.camera);}
  function dragStart(event){
    if(state.challenge||state.step===3||event.button>0)return;
    const normal=scene.camera.getWorldDirection(new THREE.Vector3());normal.x=0;if(normal.lengthSq()<1e-8)return;dragPlane.setFromNormalAndCoplanarPoint(normal.normalize(),new THREE.Vector3());
    pointerRay(event);const hit=dragRay.intersectObjects(scene.layer('charges').children,true).find(hit=>hit.object.userData.source);
    if(!hit)return;const point=new THREE.Vector3();if(!dragRay.ray.intersectPlane(dragPlane,point))return;
    stopPlay();scene.cameraMove=null;draggingSource=true;dragOffset=state.x-point.x;scene.controls.enabled=false;
    canvas.setPointerCapture(event.pointerId);canvas.style.cursor='grabbing';event.preventDefault();event.stopImmediatePropagation();
  }
  function dragMove(event){
    if(!draggingSource)return;pointerRay(event);const point=new THREE.Vector3();if(!dragRay.ray.intersectPlane(dragPlane,point))return;
    state.x=Math.max(-3.7,Math.min(3.7,point.x+dragOffset));$('#flux-source-x').value=state.x;
    if(performance.now()-lastDragRebuild>35){rebuild();lastDragRebuild=performance.now();}
    event.preventDefault();event.stopImmediatePropagation();
  }
  function dragEnd(event){if(!draggingSource)return;draggingSource=false;canvas.releasePointerCapture?.(event.pointerId);canvas.style.cursor='grab';scene.controls.enabled=true;rebuild();event.preventDefault();event.stopImmediatePropagation();}
  canvas.addEventListener('pointerdown',dragStart,true);canvas.addEventListener('pointermove',dragMove,true);canvas.addEventListener('pointerup',dragEnd,true);canvas.addEventListener('pointercancel',dragEnd,true);
  setView('front', false); setStep(2);
  if(new URLSearchParams(location.search).get('challenge')==='one-in-one-out')startGoal();
  return () => { disposed = true; cancelAnimationFrame(pending); cancelAnimationFrame(playFrame); canvas.removeEventListener('pointerdown',dragStart,true);canvas.removeEventListener('pointermove',dragMove,true);canvas.removeEventListener('pointerup',dragEnd,true);canvas.removeEventListener('pointercancel',dragEnd,true);viewportObserver.disconnect(); motionPreference.removeEventListener('change', motionChanged); scene.dispose(); container.innerHTML = ''; };
}
