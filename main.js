const PAGES={
 'particle':{file:'index.html',name:'粒子操控',tag:'01 / PARTICLE CONTROL',title:'让看不见的场，改变可见的去向。',intro:'调整源电荷，操纵一个电子的空间轨迹。<br><strong>先预测，再发射，让落点回答你。</strong>'},
 'field':{file:'field.html',name:'场的叠加',tag:'02 / FIELD WORKSHOP',title:'空间里的每一点，都有答案。',intro:'放下探针，拆开每个电荷的贡献。<br><strong>一个电场，来自整个空间中的源。</strong>'},
 'slice':{file:'slice.html',name:'三维与切片',tag:'03 / SPATIAL SLICES',title:'教材上的那张图，藏在空间里。',intro:'移动一个面，把三维数据带到二维。<br><strong>发现图里看不到的那个方向。</strong>'},
 'flux':{file:'flux.html',name:'高斯通量',tag:'04 / GAUSS LAB',title:'形状变了，什么没有变？',intro:'拉伸一个封闭面，数一数穿入与穿出。<br><strong>局部的变化，怎样服从整体的约束。</strong>'},
 'wall':{file:'cases.html',name:'事故与应用',tag:'05 / CASE WALL',title:'同一种物理，走向不同的结果。',intro:'从真实事故、工程应用与风险场景出发。<br><strong>先看证据，再寻找背后的电场。</strong>'},
 'analysis':{file:'analysis.html',name:'5W2H 分析',tag:'06 / SYSTEM ANALYSIS',title:'沿着问题，把系统拆开。',intro:'一件事，七个追问，一条可以干预的因果链。<br><strong>用物理解释结果，也说明判断的边界。</strong>'}
};
const key=document.body.dataset.page||'particle',page=PAGES[key]||PAGES.particle;
document.title=`${page.name} · 静电场空间实验室`;
document.querySelector('#app').innerHTML=`<header class="topbar"><a href="index.html" class="brand"><span class="brand-mark" aria-hidden="true"></span><span>静电场 <span style="font-weight:400;opacity:.55">/</span> 空间实验室</span></a><div class="top-note">大学物理 JC05 · OBSERVE / CHANGE / UNDERSTAND</div></header><nav class="nav" aria-label="学习空间">${Object.entries(PAGES).map(([k,p],i)=>`<a href="${p.file}" ${k===key?'class="current" aria-current="page"':''}><span>0${i+1}</span>${p.name}</a>`).join('')}</nav><main><div class="page-intro"><div><div class="eyebrow">${page.tag}</div><h1>${page.title}</h1></div><p class="intro-copy">${page.intro}</p></div><div id="experience"><div class="status">正在准备实验空间…</div></div><div id="dialogue-area"></div></main><footer class="footer"><span>静电场空间实验室 · 首期交互样板<br>看见空间，改变输入，解释结果。</span><span><a href="https://openstax.org/books/university-physics-volume-2/pages/5-introduction" target="_blank" rel="noopener">公开教材依据 ↗</a>　·　<a href="https://www.youtube.com/watch?v=-Rb9guSEeVE" target="_blank" rel="noopener">三维表达参考 ↗</a><br>装置为教学理想模型；事故页面分别标注事实、推断与未知。</span></footer>`;
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
