const PAGES={
 'particle':{file:'index.html',name:'电场与运动',tag:'01 / 电场力怎样改变运动',title:'电子为什么转弯？',intro:'想把电子送到指定位置，需要改变什么？<br><strong>先看轨迹，再逐点看它受到的力。</strong>'},
 'field':{file:'field.html',name:'电场的叠加',tag:'02 / 两个源怎样共同作用',title:'两个电荷，怎样作用于同一点？',intro:'为了预测放在这里的电荷会怎样受力。<br><strong>沿虚线看每个源的贡献，再把它们相加。</strong>'},
 'slice':{file:'slice.html',name:'电势与等势面',tag:'03 / 用电势描述能量变化',title:'电势读数，代表什么？',intro:'先理解两点之间的能量差，再认识等势面。<br><strong>零点可以换，电势差与电场不变。</strong>'},
 'flux':{file:'flux.html',name:'电通量与高斯定理',tag:'04 / 从局部作用到整体关系',title:'包住电荷，能读出什么？',intro:'能从外围的电场，判断里面有多少净电荷吗？<br><strong>把包围面上朝外、朝内的贡献合起来。</strong>'},
 'wall':{file:'cases.html',name:'真实事故与应用',tag:'05 / 从现场照片理解物理',title:'先看发生了什么，再追问为什么。',intro:'从照片进入具体事件，对照过程模型。<br><strong>事件、仿真与 5W2H 在同一个案例里。</strong>'},
 'analysis':{file:'analysis.html',name:'案例分析',tag:'05 / 回到具体事件',title:'对着这个案例，逐个追问。',intro:'照片、事件过程、仿真与分析放在一起。<br><strong>每个答案都对应这个案例的证据。</strong>'}
};
const key=document.body.dataset.page||'particle',page=PAGES[key]||PAGES.particle;
document.title=`${page.name} · 静电场空间实验室`;
document.querySelector('#app').innerHTML=`<header class="topbar"><a href="index.html" class="brand"><span class="brand-mark" aria-hidden="true"></span><span>静电场 <span style="font-weight:400;opacity:.55">/</span> 空间实验室</span></a><div class="top-note">大学物理 JC05 · 看现象 / 学概念 / 找证据</div></header><nav class="nav" aria-label="学习内容">${Object.entries(PAGES).filter(([k])=>k!=='analysis').map(([k,p],i)=>`<a href="${p.file}" ${k===key||(key==='analysis'&&k==='wall')?'class="current" aria-current="page"':''}><span>0${i+1}</span>${p.name}</a>`).join('')}</nav><main><div class="page-intro"><div><div class="eyebrow">${page.tag}</div><h1>${page.title}</h1></div><p class="intro-copy">${page.intro}</p></div><div id="experience"><div class="status">正在准备实验空间…</div></div><div id="dialogue-area"></div></main><footer class="footer"><span>静电场空间实验室 · 概念与证据<br>看现象，解释变化，再用证据判断。</span><span><a href="https://openstax.org/books/university-physics-volume-2/pages/5-introduction" target="_blank" rel="noopener">公开教材依据 ↗</a>　·　<a href="https://www.youtube.com/watch?v=-Rb9guSEeVE" target="_blank" rel="noopener">三维表达参考 ↗</a><br>模型与现场资料分开标注；未知信息不补成事实。</span></footer>`;
const container=document.querySelector('#experience');
try{
 let dispose;
 if(key==='particle')dispose=(await import('./particle-page.js')).mountParticle(container);
 if(key==='field')dispose=(await import('./field-page.js')).mountField(container);
 if(key==='slice')dispose=(await import('./slice-page.js')).mountSlice(container);
 if(key==='flux')dispose=(await import('./flux-page.js')).mountFlux(container);
 if(key==='wall'||key==='analysis')dispose=(await import('./risk.js')).mountRisk(container,{mode:key==='wall'?'wall':'analysis',caseId:new URLSearchParams(location.search).get('case')||undefined,onNavigate:(mode,id)=>{location.href=`${mode==='wall'?'cases':'analysis'}.html?case=${encodeURIComponent(id)}`}});
 window.addEventListener('pagehide',()=>dispose?.(),{once:true});
 document.body.dataset.ready='true';
}catch(error){console.error(error);container.innerHTML='<div class="error">实验空间暂未载入。请刷新页面；三维实验需要支持 WebGL 的浏览器。<br>事故墙与 5W2H 分析可通过上方导航继续使用。</div>';document.body.dataset.ready='error';}
if(key==='particle'){
 const {DIALOGUE}=await import('./learning-content.js');
 document.querySelector('#dialogue-area').innerHTML=`<details class="learning podcast" style="margin-top:16px"><summary>两种视角，一起想明白 · 豆包双人对话 · 74 秒</summary><div id="podcast-player"></div><div class="dialogue-text">${DIALOGUE.map((x,i)=>`<p data-dialogue="${i}"><strong>${x.speaker}</strong>　${x.text}</p>`).join('')}</div></details>`;
 try{const response=await fetch('./media/podcast-status.json');if(response.ok){const info=await response.json();if(info.ready){document.querySelector('#podcast-player').innerHTML=`<p>豆包合成语音 · ${info.durationLabel||'约 90 秒'} · 云舟 / VV</p><audio controls preload="metadata" style="width:100%" src="./media/electric-field-dialogue.mp3"></audio><p id="live-caption" class="status" aria-live="off">播放时在这里显示当前对话。也可以阅读下方全文。</p>`;const timeline=await (await fetch('./media/electric-field-dialogue.timeline.json')).json();const audio=document.querySelector('audio');audio.addEventListener('timeupdate',()=>{const i=timeline.findIndex(x=>audio.currentTime>=x.start&&audio.currentTime<x.end);document.querySelectorAll('[data-dialogue]').forEach((p,j)=>p.classList.toggle('speaking',i===j));if(i>=0)document.querySelector('#live-caption').textContent=timeline[i].speaker+'：'+timeline[i].text;});}}}catch{}
}
