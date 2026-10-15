document.body.classList.add('cinematic');
document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#080f19');
const PAGES={
 'aim':{file:'aim.html',name:'瞄准自由靶'},
 'collector':{file:'wall.html',name:'壁面收集'},
 'particle':{file:'particle.html',name:'电场与运动',tag:'01 / 电场力怎样改变运动',title:'电子为什么转弯？',intro:'想把电子送到指定位置，需要改变什么？<br><strong>XY 看上下，XZ 看深度；再逐点看受力。</strong>'},
 'field':{file:'field.html',name:'电场的叠加',tag:'02 / 从整体形状到局部受力',title:'两个电荷，在同一处怎样相加？',intro:'沿两条连线看分场，再看它们的矢量和。<br><strong>拖动黄点，比较同一位置受到的作用。</strong>'},
 'slice':{file:'slice.html',name:'电势与等势面',tag:'03 / 用电势描述能量变化',title:'电势读数，代表什么？',intro:'向外移动做多少功？沿等势面走又怎样？<br><strong>看力与位移的夹角，理解能量变化。</strong>'},
 'flux':{file:'flux.html',name:'电通量与高斯定理',tag:'04 / 从局部作用到整体关系',title:'包住电荷，能读出什么？',intro:'能从外围的电场，判断里面有多少净电荷吗？<br><strong>把包围面上朝外、朝内的贡献合起来。</strong>'},
 'wall':{file:'cases.html',name:'真实事故与应用',tag:'05 / 从现场照片理解物理',title:'先看发生了什么，再追问为什么。',intro:'从照片进入具体事件，对照过程模型。<br><strong>事件、仿真与 5W2H 在同一个案例里。</strong>'},
 'charge':{file:'charge.html',name:'充电与传播',tag:'06 / 从静电走向变化的场',title:'电荷积累之后，会发生什么？',intro:'先看金属球充电、间隙放电，再看振荡的源。<br><strong>近处的变化，怎样到达远处？</strong>'},
 'beam':{file:'index.html',name:'粒子收集挑战',tag:'进阶挑战 / 发射 → 加速 → 转向 → 收集',title:'把一束电子，送进同一个出口。',intro:'速度和角度各不相同，怎样接住更多？<br><strong>先加速，再引导；把两个投影合成空间轨迹。</strong>'},
 'engine':{file:'engine.html',name:'Godot 叠加体验',tag:'空间体验 / 同一个物理模型',title:'把两个电场放进同一个空间。',intro:'拖动源电荷与观察点，直接看合场。<br><strong>比较空间质感，也核对每一个受力方向。</strong>'},
 'analysis':{file:'analysis.html',name:'案例分析',tag:'05 / 回到具体事件',title:'对着这个案例，逐个追问。',intro:'照片、事件过程、仿真与分析放在一起。<br><strong>每个答案都对应这个案例的证据。</strong>'}
};
const key=document.body.dataset.page||'particle',page=PAGES[key]||PAGES.particle;
document.title=`${page.name} · 静电场空间实验室`;
const shortTitles={particle:'单粒子练习',beam:'电子束',aim:'瞄准自由靶',collector:'壁面收集',field:'电场叠加',slice:'电势',flux:'电通量',wall:'事故与应用',charge:'充电与传播',engine:'电场叠加',analysis:'案例分析'};
document.querySelector('#app').innerHTML=`<header class="topbar"><a href="index.html" class="brand"><span class="brand-mark" aria-hidden="true"></span><span>静电场实验室</span></a><nav class="nav" aria-label="实验">${['beam','field','slice','flux','wall','charge'].map(k=>[k,PAGES[k]]).map(([k,p])=>`<a href="${p.file}" ${k===key||(key==='analysis'&&k==='wall')||(key==='engine'&&k==='field')||(key==='particle'&&k==='beam')?'class="current" aria-current="page"':''}>${shortTitles[k]}</a>`).join('')}</nav></header><main><div class="page-intro"><h1>${shortTitles[key]||page.name}</h1></div><div id="experience"><div class="status">载入中…</div></div><div id="dialogue-area"></div></main><footer class="footer"><details><summary>资料与模型说明</summary><p><a href="https://openstax.org/books/university-physics-volume-2/pages/5-introduction" target="_blank" rel="noopener">公开教材 ↗</a>　<a href="https://www.youtube.com/watch?v=aXRTczANuIs" target="_blank" rel="noopener">视频参考 ↗</a>　<a href="https://github.com/syzhaoln-stack/electrostatic-space-lab" target="_blank" rel="noopener">源码与模型范围 ↗</a></p><p>粒子与场由模型计算；事故装置与放电过程为定性教学示意。照片来源见各案例。</p></details></footer>`;

const container=document.querySelector('#experience');
try{
 let dispose;
 if(key==='beam'){const hero=document.createElement('div');hero.id='home-oscillation';document.querySelector('.page-intro').before(hero);const disposeHero=(await import('./home-field.js')).mountHomeField(hero);const disposeBeam=(await import('./beam-page.js')).mountBeam(container);dispose=()=>{disposeHero();disposeBeam?.()};}
 if(key==='engine')dispose=(await import('./engine-page.js')).mountEngine(container);
 if(key==='aim')dispose=(await import('./aim-page.js')).mountAim(container);
 if(key==='collector')dispose=(await import('./wall-page.js')).mountWall(container);
 if(key==='particle')dispose=(await import('./particle-page.js')).mountParticle(container);
 if(key==='field')dispose=(await import('./field-page.js')).mountField(container);
 if(key==='slice')dispose=(await import('./slice-page.js')).mountSlice(container);
 if(key==='flux')dispose=(await import('./flux-page.js')).mountFlux(container);
 if(key==='charge')dispose=(await import('./charge-page.js')).mountCharge(container);
 if(key==='wall'||key==='analysis')dispose=(await import('./risk.js')).mountRisk(container,{mode:key==='wall'?'wall':'analysis',caseId:new URLSearchParams(location.search).get('case')||undefined,onNavigate:(mode,id)=>{location.href=`${mode==='wall'?'cases':'analysis'}.html?case=${encodeURIComponent(id)}`}});
 window.addEventListener('pagehide',()=>dispose?.(),{once:true});
 if(['beam','aim','collector'].includes(key)){
  const related=document.createElement('nav');related.className='experiment-links';related.setAttribute('aria-label','继续实验');
  related.innerHTML=[['beam','index.html','收集电子束','加速、转向，穿过接收孔'],['aim','aim.html','瞄准自由靶','靶也受电场力，同一刻释放'],['collector','wall.html','把粒子送上壁面','100 个粒子，落在同一片亮区']].filter(([id])=>id!==key).map(([,href,title,copy])=>`<a href="${href}"><span>${title} <b aria-hidden="true">↗</b></span><small>${copy}</small></a>`).join('');container.after(related);
  if(key!=='beam')document.querySelector('.nav a[href="index.html"]').classList.add('current');
 }
 document.body.dataset.ready='true';
}catch(error){console.error(error);container.innerHTML='<div class="error">实验空间暂未载入。请刷新页面；三维实验需要支持 WebGL 的浏览器。<br>事故墙与 5W2H 分析可通过上方导航继续使用。</div>';document.body.dataset.ready='error';}
if(key==='particle'){
 const {DIALOGUE}=await import('./learning-content.js');
 document.querySelector('#dialogue-area').innerHTML=`<details class="learning podcast" style="margin-top:16px"><summary>语音 · 74 秒</summary><div id="podcast-player"></div><div class="dialogue-text">${DIALOGUE.map((x,i)=>`<p data-dialogue="${i}"><strong>${x.speaker}</strong>　${x.text}</p>`).join('')}</div></details>`;
 try{const response=await fetch('./media/podcast-status.json');if(response.ok){const info=await response.json();if(info.ready){document.querySelector('#podcast-player').innerHTML=`<p>豆包合成语音 · ${info.durationLabel||'约 90 秒'} · 云舟 / VV</p><audio controls preload="metadata" style="width:100%" src="./media/electric-field-dialogue.mp3"></audio><p id="live-caption" class="status" aria-live="off">播放时在这里显示当前对话。也可以阅读下方全文。</p>`;const timeline=await (await fetch('./media/electric-field-dialogue.timeline.json')).json();const audio=document.querySelector('audio');audio.addEventListener('timeupdate',()=>{const i=timeline.findIndex(x=>audio.currentTime>=x.start&&audio.currentTime<x.end);document.querySelectorAll('[data-dialogue]').forEach((p,j)=>p.classList.toggle('speaking',i===j));if(i>=0)document.querySelector('#live-caption').textContent=timeline[i].speaker+'：'+timeline[i].text;});}}}catch{}
}
