import * as THREE from 'three';
import { FieldScene, bindViews, stageChrome, slider } from './scene.js';
import { CONSTANTS, fieldAt, gaussianFlux } from './physics.js';

const fmt = (v, digits = 3) => Number(v).toFixed(digits);
const norm = v => Math.hypot(...v);
const vectorText = v => `(${v.map(x => fmt(x, 1)).join(', ')})`;

export function mountFlux(container) {
  const uid = `flux-${Math.random().toString(36).slice(2, 7)}`;
  const id = suffix => `${uid}-${suffix}`;
  container.innerHTML = `<div class="lab-layout flux-lab">
    <div class="stage-wrap"><div class="stage"></div>${stageChrome('把一个空间包起来', '点选表面 · 橙色净流出，蓝色净流入')}
      <div class="flux-key" style="position:absolute;left:22px;top:85px;background:#ffffffd9;border-radius:12px;padding:10px 13px;font-size:12px;pointer-events:none;color:#466072">这是想象的高斯面，可穿过空间，不是实体外壳。<br><span style="color:#cc6a30">■ +500 V/m 向外</span>　<span style="color:#347da8">■ −500 V/m 向内</span><br>固定色标，超过范围饱和；精确值可点选查看。</div>
    </div>
    <aside class="panel">
      <div class="eyebrow">04 / 电通量与高斯定理</div>
      <h2>外面的电荷，<br>能改变净通量吗？</h2>
      <p>先移动、压扁这个闭合面，再打开外部电荷。看局部的场如何改变，所有面片的贡献相加又怎样。</p>
      ${slider(id('charge'), '源球总电荷 Q', -0.3, 0.3, 0.01, 0.1, 'pC')}
      ${slider(id('center'), '高斯面中心 x', -2.8, 2.8, 0.05, 0, 'mm')}
      ${slider(id('radius'), '高斯面 x 半轴', 0.8, 2.4, 0.05, 1.8, 'mm')}
      <label class="check"><input type="checkbox" id="${id('external')}"> 加入外部 +0.14 pC 电荷</label>
      <div class="readouts" style="margin-top:18px">
        <div class="readout" style="min-width:0"><span>表面积分的数值结果</span><strong id="${id('flux')}" style="font-size:13px;letter-spacing:0;overflow-wrap:anywhere">—</strong><small>V·m</small></div>
        <div class="readout" style="min-width:0"><span>高斯定理 Q<sub>内</sub> / ε₀</span><strong id="${id('expected')}" style="font-size:13px;letter-spacing:0;overflow-wrap:anywhere">—</strong><small>V·m</small></div>
      </div>
      <div class="status" id="${id('status')}" aria-live="polite"></div>
      <details open style="margin-top:18px"><summary>选中的面片</summary><div id="${id('patch')}" style="font-size:13px;line-height:1.85;margin-top:8px">点击三维表面，比较电场 E 与外法线 n。</div></details>
      <button id="${id('reset')}" style="margin-top:18px">恢复初始场景</button>
      <p class="formula-note" style="margin-top:14px">源是均匀带电绝缘球，半径 0.22 mm。面片颜色按 E·n 编码，箭头长度用于辨认方向。数值积分存在离散误差；高斯定理本身对任意闭合面成立。</p>
    </aside>
  </div>
  <div class="formula-strip"><div class="formula" style="font-size:clamp(15px,1.5vw,22px);white-space:normal">Φ = ∮ E · n dA = Q<sub>内</sub> / ε₀</div><div class="formula-note">局部电场由全部电荷决定；闭合面的净通量由包围的净电荷决定。</div></div>`;
  const el = suffix => container.querySelector(`#${id(suffix)}`);
  const scene = new FieldScene(container.querySelector('.stage'), { extent: 7 });
  bindViews(container, scene);
  scene.camera.position.set(10, 7, 13);
  scene.controls.target.set(0.6, 0, 0);
  const state = { charge: 0.1, center: 0, radius: 1.8, external: false };
  let sources, selected = { u: 0.15, phi: 0.7 }, pending = 0, disposed = false;
  const radii = () => [state.radius, 2.2, 1.8];
  const point = (u, phi) => {
    const r = Math.sqrt(Math.max(0, 1 - u * u));
    return [state.center + state.radius * r * Math.cos(phi), 2.2 * u, 1.8 * r * Math.sin(phi)];
  };
  const patchData = (u, phi, du = 2 / 18, dphi = 2 * Math.PI / 32) => {
    const pos = point(u, phi), r = Math.sqrt(1 - u * u);
    const areaVector = [2.2 * 1.8 * r * Math.cos(phi), state.radius * 1.8 * u, state.radius * 2.2 * r * Math.sin(phi)];
    const magnitude = norm(areaVector), normal = areaVector.map(x => x / magnitude);
    const { E, V } = fieldAt(pos, sources);
    const En = E.reduce((sum, x, i) => sum + x * normal[i], 0);
    const area = magnitude * du * dphi * 1e-6;
    return { pos, normal, E, V, En, area, dPhi: En * area, u, phi };
  };

  function showPatch() {
    const p = patchData(selected.u, selected.phi);
    scene.clearLayer('selected');
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: '#f5b43c', depthTest: false }));
    dot.position.set(...p.pos); dot.renderOrder = 20; scene.layer('selected').add(dot);
    scene.arrow(p.pos, p.E, '#117b88', 1.05, 'selected');
    scene.arrow(p.pos, p.normal, '#5e507f', 0.85, 'selected');
    scene.label('E', p.pos.map((v, i) => v + (p.E[i] / (norm(p.E) || 1)) * 1.22), '#117b88', 'selected', 0.3);
    scene.label('外法线 n', p.pos.map((v, i) => v + p.normal[i] * 1.05), '#5e507f', 'selected', 0.3);
    el('patch').innerHTML = `位置 / mm：${vectorText(p.pos)}<br>E / (V/m)：${vectorText(p.E)}<br>外法线：${p.normal.map(x => fmt(x, 2)).join('，')}<br><b>E·n = ${fmt(p.En, 1)} V/m</b>（${p.En >= 0 ? '向外' : '向内'}贡献）<br>此面片约贡献：${p.dPhi.toExponential(3)} V·m`;
  }

  function rebuild() {
    if (disposed) return;
    scene.clearLayer('charges'); scene.clearLayer('surface'); scene.clearLayer('wire');
    sources = [{ id: 'Q', label: 'Q', pos: [0, 0, 0], radius: 0.22, Q: state.charge }];
    if (state.external) sources.push({ id: 'external', label: '外部', pos: [6.2, 0.7, 0], radius: 0.22, Q: 0.14 });
    sources.forEach(source => scene.charge(source));
    const patches = [], nu = 18, np = 32;
    const maxEn = 500;
    for (let j = 0; j < nu; j++) for (let i = 0; i < np; i++) {
      const u0 = -1 + j * 2 / nu, u1 = -1 + (j + 1) * 2 / nu;
      const phi0 = i * Math.PI * 2 / np, phi1 = (i + 1) * Math.PI * 2 / np;
      const data = patchData((u0 + u1) / 2, (phi0 + phi1) / 2);
      patches.push({ data, corners: [point(u0, phi0), point(u1, phi0), point(u1, phi1), point(u0, phi1)] });
    }
    for (const patch of patches) {
      const { data, corners } = patch;
      const vertices = [corners[0], corners[1], corners[2], corners[0], corners[2], corners[3]].flat();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
      const strength = Math.pow(Math.min(1, Math.abs(data.En) / maxEn), 0.45);
      const color = new THREE.Color('#d8e2e9').lerp(new THREE.Color(data.En >= 0 ? '#d97b39' : '#388bb7'), strength);
      const material = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.43 + strength * 0.2, side: THREE.DoubleSide, roughness: 0.75, depthWrite: false });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { pickable: true, fluxPatch: true, u: data.u, phi: data.phi }; scene.layer('surface').add(mesh);
    }
    // A sparse wire frame explains surface geometry without overpowering color.
    for (let j = 1; j < 9; j++) {
      const u = -1 + j * 2 / 9;
      scene.line(Array.from({ length: 65 }, (_, i) => point(u, i * Math.PI * 2 / 64)), '#7991a0', 'wire', 0.28);
    }
    for (let i = 0; i < 12; i++) scene.line(Array.from({ length: 65 }, (_, j) => point(-1 + j * 2 / 64, i * Math.PI * 2 / 12)), '#7991a0', 'wire', 0.28);

    const flux = gaussianFlux([state.center, 0, 0], radii(), sources);
    const scaledCenter = Math.abs(state.center) / state.radius;
    const margin = 0.22 / Math.min(...radii());
    const inside = scaledCenter + margin < 1;
    const outside = scaledCenter - margin > 1;
    const expected = inside ? state.charge * 1e-12 / CONSTANTS.epsilon0 : 0;
    el('flux').textContent = flux.toExponential(3);
    el('expected').textContent = inside || outside ? expected.toExponential(3) : '部分相交';
    el('status').textContent = inside
      ? `源球完全在面内。${state.external ? '外部电荷改变各面片的场，净通量仍由内部 Q 决定。' : '改变面的形状，包围的电荷仍然相同。'} 数值差：${Math.abs(flux - expected).toExponential(1)} V·m。`
      : outside
        ? '源球完全在面外。面内没有净电荷，流入与流出相抵；局部电场仍可不为零。'
        : '高斯面接近或穿过源球表面：包围的电荷可能只是一部分。此处不把整个 Q 代入；移动远一点可比较明确的内、外两种情况。';
    showPatch();
  }

  scene.onPick((point, object) => {
    if (object?.userData?.fluxPatch) {
      selected = { u: object.userData.u, phi: object.userData.phi };
      showPatch();
    }
  });
  const schedule = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(rebuild); };
  for (const key of ['charge', 'center', 'radius']) {
    el(key).addEventListener('input', () => {
      state[key] = Number(el(key).value);
      el(`${key}-value`).textContent = `${fmt(state[key], 2)} ${key === 'charge' ? 'pC' : 'mm'}`;
      schedule();
    });
  }
  el('external').addEventListener('change', () => { state.external = el('external').checked; schedule(); });
  el('reset').addEventListener('click', () => {
    Object.assign(state, { charge: 0.1, center: 0, radius: 1.8, external: false });
    for (const key of ['charge', 'center', 'radius']) { el(key).value = state[key]; el(`${key}-value`).textContent = `${fmt(state[key], 2)} ${key === 'charge' ? 'pC' : 'mm'}`; }
    el('external').checked = false; scene.view('iso'); rebuild();
  });
  rebuild();
  return () => { disposed = true; cancelAnimationFrame(pending); scene.dispose(); container.innerHTML = ''; };
}
