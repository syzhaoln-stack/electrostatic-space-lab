const sources = {
  desmoines: 'https://www.csb.gov/csb-finds-static-spark-set-off-fire-and-explosions-at-barton-solvents-des-moines-facility-investigation-finds-equipment-not-intended-for-flammable-service-or-properly-bonded-and-grounded/',
  valley: 'https://www.csb.gov/csb-issues-final-report-on-barton-solvents-explosion-calls-on-osha-and-trade-associations-to-improve-material-safety-data-sheets-for-nonconductive-flammable-liquids-safety-video-with-animation-released/',
  glenpool: 'https://www.ntsb.gov/investigations/Pages/DCA03MP001.aspx',
  esd: 'https://sma.nasa.gov/vids/video-item/electrostatic-discharge-overview',
  esp: 'https://www.epa.gov/air-emissions-monitoring-knowledge-base/monitoring-control-technique-electrostatic-precipitators'
};

const CASES = [
  {id:'desmoines',kind:'事故',date:'2007.10.29',place:'美国 · Des Moines',title:'一次灌装，一次火花',subtitle:'Barton Solvents 溶剂火灾',tag:'静电积累 → 放电 → 点燃',type:'tank',color:'amber',agency:'CSB',certainty:'调查认定静电火花引发火灾；具体火花路径为推断。',summary:'乙酸乙酯灌入便携钢罐时发生火灾。CSB 指出设备不适用于易燃液体输送，部分金属件未有效等电位连接与接地。',question:'金属是导体，为什么还可能积累电荷？',concept:'导体允许电荷移动；与其他物体和大地隔离的导体，仍可能带电。',chain:['液体输送','孤立金属件积累电荷','可能向钢罐放电','蒸气被点燃'],unknown:'火花瞬间的电压、间距与放电能量：此处所用调查摘要未给出，不能补成精确仿真。',facts:{what:'灌装钢罐起火，火势蔓延并破坏仓库。',why:'CSB 认定静电火花是起火原因；具体放电路径表述为“很可能”。',who:'Barton Solvents 的灌装作业及设备系统。',when:'2007 年 10 月 29 日，约下午 1 时。',where:'美国爱荷华州 Des Moines，包装作业区。',how:'液体输送 → 孤立金属件可能带电 → 向钢罐放电 → 点燃蒸气。',much:'1 名员工轻伤；1 名消防员因热相关不适接受治疗。'},lesson:'等电位连接与接地解决的是电荷转移路径；还需考虑设备适用性和其他事故条件。'},
  {id:'valley',kind:'事故',date:'2007.07.17',place:'美国 · Valley Center',title:'接了地，问题就消失了吗？',subtitle:'Barton Solvents 储罐爆炸',tag:'液体带电 · 内部浮子',type:'tank',color:'amber',agency:'CSB',certainty:'浮子连接处火花是 CSB 给出的“最可能原因”，不是直接拍摄到的事实。',summary:'低导电性溶剂输送进罐时发生爆炸。CSB 认为，内部浮子连接处产生火花最有可能；外部输送设备很可能已正确连接与接地。',question:'接地的罐，是否意味着液体和每个内部零件都不带电？',concept:'必须逐一判断电荷能否流走。金属罐接地，不能直接推出低导电性液体会立即放电。',chain:['低导电性液体输送','电荷消散较慢','浮子连接处可能放电','罐内蒸气混合物点燃'],unknown:'具体瞬时火花位置与电压未直接测得；不要把调查中的“最可能”写成唯一确定路径。',facts:{what:'罐区爆炸与火灾，波及厂外。',why:'最可能由浮子连接处的静电火花点燃罐内混合物。',who:'Barton Solvents 的储罐、输送设备及内部液位浮子。',when:'2007 年 7 月 17 日。',where:'美国堪萨斯州 Valley Center。',how:'低导电性液体积累电荷，内部浮子连接处可能形成放电间隙。',much:'约 6,000 名居民疏散；11 名居民和 1 名消防员就医。'},lesson:'这个事件与 10 月的 Des Moines 火灾是两起事故。不能用“外壳接地”代替对内部每条电荷路径的判断。'},
  {id:'glenpool',kind:'事故',date:'2003.04.07',place:'美国 · Glenpool',title:'换了液体，环境也换了吗？',subtitle:'Glenpool 储罐爆炸与火灾',tag:'换装操作 · 残留气氛',type:'tank',color:'amber',agency:'NTSB',certainty:'NTSB 给出的 probable cause：静电放电点燃罐内可燃混合物。',summary:'原先装汽油的储罐在灌入柴油时爆炸。NTSB 将不当储罐操作引起的静电放电列为认定的可能原因。',question:'判断风险时，只看此刻流入的液体够不够？',concept:'系统状态还包括之前留下的气氛、流动过程和电荷积累。',chain:['换装与灌注','电荷积累与放电','罐内存在可燃混合物','爆炸并持续燃烧'],unknown:'本页面不据结果反推火花电压，也不把“装入柴油”当作已排除可燃气氛。',facts:{what:'11 号储罐在灌入柴油时爆炸并燃烧。',why:'NTSB 认为不当储罐操作导致静电放电，点燃可燃燃料—空气混合物。',who:'ConocoPhillips 储罐运行系统。',when:'2003 年 4 月 7 日，约晚 8:55（当地时间）。',where:'美国俄克拉何马州 Glenpool South 罐区。',how:'此前汽油被移出；柴油灌注过程中发生静电点火。',much:'燃烧约 21 小时；无人员伤亡，附近学校停课 2 天。'},lesson:'事故由电、流体、气氛与操作共同形成。静电场知识帮助识别其中一条因果链。'},
  {id:'esd',kind:'风险场景',date:'通用风险',place:'电子器件 · 装配与接触',title:'你没感觉到，芯片可能受伤',subtitle:'敏感电子硬件的 ESD 风险',tag:'微小放电 · 器件损伤',type:'chip',color:'teal',agency:'NASA',certainty:'NASA 风险科普；这里没有声称发生过某次具体事故。',summary:'NASA 提醒：人感受不到的微小静电放电，也可能损伤敏感硬件。是否“电到人”不是可靠的器件损伤判据。',question:'没有痛感，是否等于没有能量转移？',concept:'电荷转移与能量变化并不需要达到人体可感知的程度。',chain:['物体带电','接近或接触器件','电荷快速转移','敏感结构可能损伤'],unknown:'未指定器件型号和耐受等级，不能计算“这个电压一定损坏”。',facts:{what:'微小静电放电可能伤害敏感电子硬件。',why:'瞬态电荷转移可能超过敏感结构承受能力。',who:'带电物体、接触路径与敏感器件。',when:'接近、接触等允许电荷转移的时刻；非具体事故时间。',where:'电子硬件处理场景；非某一事故地点。',how:'电荷从带电物体经路径转移，局部结构可能受损。',much:'损伤阈值依赖器件与放电条件；来源未给出统一数值。'},lesson:'同一个放电过程，对人和对微小器件的影响可能很不同。'},
  {id:'esp',kind:'应用',date:'工程应用',place:'空气污染控制 · 静电除尘',title:'把颗粒从气流里“拉”出来',subtitle:'Electrostatic precipitator',tag:'粒子带电 · 电场收集',type:'collector',color:'teal',agency:'US EPA',certainty:'EPA 对技术原理的说明；图为教学示意，不是特定设备的设计图。',summary:'静电除尘器使颗粒带电，利用电场把它们收集到极板，再将沉积物移除。',question:'气流向前，为什么颗粒能向侧面移动？',concept:'颗粒的速度方向可以与电场力方向不同；电场力改变它的运动。',chain:['颗粒获得电荷','电场施加力 F = qE','颗粒横向迁移','极板收集并清除'],unknown:'真实效率还依赖气流、粒径、颗粒电阻率和设备结构；本页面不预测除尘率。',facts:{what:'从气流中移除颗粒物。',why:'带电颗粒受到电场力，可向收集面迁移。',who:'放电电极、带电颗粒、收集极板和清灰系统。',when:'颗粒经过装置的运行过程。',where:'工业气体污染控制装置。',how:'带电 → 电场迁移 → 收集 → 清除。',much:'实际性能取决于多种参数，不由 qE 一个公式直接给出。'},lesson:'在粒子操控实验里练习控制轨迹，到了真实工程还需加上气流阻力与收集条件。'}
];

const QS=[['what','WHAT','发生了什么'],['why','WHY','为什么发生'],['who','WHO','涉及谁与什么'],['when','WHEN','何时'],['where','WHERE','何地'],['how','HOW','过程怎样连接'],['much','HOW MUCH','影响有多大']];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external=(url,label)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span></a>`;

function drawing(type, id='d', active=true){
  const common=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3fafc"/><stop offset="1" stop-color="#c2d9df"/></linearGradient></defs>`;
  if(type==='chip')return `<svg viewBox="0 0 340 170" aria-hidden="true">${common}<path d="M70 128 173 68 280 126 176 165Z" fill="#d8e8ed"/><path d="M119 96 170 67 225 97 174 128Z" fill="#173447"/><path d="M119 96v16l55 31v-15m51-31v16l-51 30" fill="#294f62"/><g stroke="#7898a5" stroke-width="5">${Array.from({length:6},(_,i)=>`<path d="M${110+i*9} ${105+i*5}l-20 12 M${181+i*9} ${130-i*5}l20 12"/>`).join('')}</g><path class="rw-spark" d="M170 8 147 46h26l-11 34 37-47h-28l15-25" fill="#ecab46"/><circle cx="78" cy="35" r="17" fill="#fff"/><text x="78" y="41" text-anchor="middle" fill="#087e8b" font-size="22">−</text></svg>`;
  if(type==='collector')return `<svg viewBox="0 0 340 170" aria-hidden="true">${common}<path d="M78 29 197 9 289 50 170 71Z" fill="#c9dce2"/><path d="M170 71v83l119-33V50" fill="url(#${id})"/><path d="M78 29v83l92 42V71Z" fill="#e4eff1"/>${[0,1,2].map(i=>`<path d="M${106+i*37} ${47+i*8}v71l48 22V69Z" fill="#a2c4cc" stroke="#6a9faa"/>`).join('')}<g fill="#ecab46">${Array.from({length:12},(_,i)=>`<circle cx="${22+(i%4)*22}" cy="${50+Math.floor(i/4)*29}" r="3"/>`).join('')}</g><path d="M20 140h79m-10-7 10 7-10 7" stroke="#087e8b" stroke-width="2" fill="none"/></svg>`;
  return `<svg viewBox="0 0 340 170" aria-hidden="true">${common}<path d="M105 36v94c0 17 126 17 126 0V36" fill="url(#${id})" stroke="#86a8b3"/><ellipse cx="168" cy="36" rx="63" ry="19" fill="#f0f8fa" stroke="#86a8b3"/><path d="M106 91v39c0 17 124 17 124 0V91" fill="#83bdc5" opacity=".65"/><ellipse cx="168" cy="91" rx="62" ry="17" fill="#a8d4d9"/><path d="M46 27h91v42" stroke="#456a7c" stroke-width="9" fill="none"/><path d="M47 27h90v42" stroke="#b8d0d7" stroke-width="4" fill="none"/><path d="M231 132h38v19m-14 0h28m-22 6h16m-11 6h6" stroke="#087e8b" stroke-width="2" fill="none"/><g fill="#087e8b" font-size="17" text-anchor="middle"><text x="136" y="107">+</text><text x="168" y="119">+</text><text x="199" y="104">+</text></g><path class="rw-spark ${active?'':'rw-dim'}" d="M190 40 177 61h13l-6 20 23-27h-14l11-14" fill="#ecab46"/><path d="M109 146 67 162m162-16 42 16" stroke="#b0c7d0"/></svg>`;
}

function sourceRow(c){return `<div class="rw-source"><span>一手来源 · ${c.agency}</span>${external(sources[c.id],'查看原文')}</div>`;}

export function mountRisk(container, {mode='wall',caseId='desmoines',onNavigate}={}){
  let selected=CASES.some(c=>c.id===caseId)?caseId:'desmoines', filter='全部', question='what';
  let disposed=false;
  container.classList.add('risk-root');
  const state={charge:true,spark:true,atmosphere:true,voltage:3,capacitance:100};
  const caseById=()=>CASES.find(c=>c.id===selected)||CASES[0];

  function detail(c){return `<aside class="rw-detail" aria-label="案例详情"><div class="rw-detail-top"><span class="rw-eyebrow">打开一条证据链</span><span class="rw-kind ${c.color}">${c.kind}</span></div><h2>${c.title}</h2><p class="rw-question">${c.question}</p><p>${c.summary}</p><div class="rw-chain-mini">${c.chain.map((x,i)=>`<div><span>${i+1}</span><p>${x}</p></div>`).join('')}</div><div class="rw-concept"><span>连接到静电场</span><p>${c.concept}</p></div><details class="rw-evidence"><summary>证据到哪里为止？</summary><p>${c.certainty}</p><p>${c.unknown}</p></details>${sourceRow(c)}<button class="rw-primary" data-action="analyze" data-id="${c.id}">用 5W2H 拆开这个案例 <span>↗</span></button></aside>`;}

  function renderWall(){
    mode='wall'; const shown=CASES.filter(c=>filter==='全部'||c.kind===filter);
    if(!shown.some(c=>c.id===selected))selected=shown[0].id;
    container.innerHTML=`<div class="rw-page"><div class="rw-toolbar"><div class="rw-filters" role="group" aria-label="筛选案例">${['全部','事故','风险场景','应用'].map(f=>`<button data-filter="${f}" aria-pressed="${f===filter}">${f}</button>`).join('')}</div><span class="rw-muted">3 起真实事故 · 1 个风险场景 · 1 项应用</span></div><div class="rw-wall-layout"><div class="rw-card-grid">${shown.map(c=>`<button class="rw-case-card ${c.id===selected?'selected':''}" data-case="${c.id}" aria-pressed="${c.id===selected}"><div class="rw-card-meta"><span class="rw-kind ${c.color}">${c.kind}</span><span>${c.date}</span></div><div class="rw-card-drawing">${drawing(c.type,'card-'+c.id)}<span>原理示意</span></div><div class="rw-card-text"><small>${c.place}</small><h2>${c.title}</h2><p>${c.subtitle}</p><div class="rw-card-foot"><span>${c.tag}</span><b aria-hidden="true">↗</b></div></div></button>`).join('')}</div>${detail(caseById())}</div></div>`;
  }

  function renderAnalysis(){
    mode='analysis'; const c=caseById();
    container.innerHTML=`<div class="rw-page rw-analysis"><div class="rw-analysis-select"><label for="rw-case-select">分析对象</label><select id="rw-case-select">${CASES.map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${x.kind} · ${x.subtitle}</option>`).join('')}</select><button class="rw-text-button" data-action="wall">返回事故与应用墙 ↗</button></div><div class="rw-analysis-layout"><section class="rw-question-board"><div class="rw-panel-heading"><span class="rw-eyebrow">5W2H</span><span class="rw-kind ${c.color}">${c.kind}</span></div><h2>${c.title}</h2><div class="rw-seven" role="tablist" aria-label="七个分析问题">${QS.map(([key,en,cn])=>`<button role="tab" aria-selected="${key===question}" aria-controls="rw-answer" data-question="${key}" id="rw-q-${key}"><strong>${en}</strong><span>${cn}</span></button>`).join('')}</div><div class="rw-answer" id="rw-answer" role="tabpanel" aria-labelledby="rw-q-${question}" tabindex="0"><span>${QS.find(x=>x[0]===question)[2]}</span><p>${c.facts[question]}</p><small>${question==='why'||question==='how'?c.certainty:'依据来源摘要；未知信息不补写。'}</small></div>${sourceRow(c)}<details class="rw-evidence"><summary>还缺哪些信息？</summary><p>${c.unknown}</p></details><div class="rw-concept"><span>把判断带回模型</span><p>${c.lesson}</p></div></section><section class="rw-causal-panel"><div class="rw-panel-heading"><span class="rw-eyebrow">改变条件 / 定性教学模型</span><button class="rw-reset" data-action="reset">重置 ↻</button></div><h2>让点火链停在哪里？</h2><p class="rw-small">以下是通用的静电点火条件实验，不复现所选事故，也不判断现场是否安全。</p><div class="rw-causal-scene"><div class="rw-causal-art">${drawing('tank','analysis-tank')}</div><div class="rw-condition-readout"><span>当前模型</span><strong id="rw-risk-state"></strong></div></div><div class="rw-condition-list">${[['charge','电荷积累','有可持续积累的电荷'],['spark','有效放电','存在可能点火的放电'],['atmosphere','可点燃气氛','存在可点燃的混合物']].map(([key,title,desc],i)=>`<label class="rw-condition"><span class="rw-condition-index">${i+1}</span><span><b>${title}</b><small>${desc}</small></span><input type="checkbox" data-condition="${key}" ${state[key]?'checked':''}><span class="rw-switch" aria-hidden="true"></span></label>`).join('')}</div><p class="rw-causal-feedback" id="rw-causal-feedback" aria-live="polite"></p><div class="rw-energy"><div class="rw-panel-heading"><span>能量数量级实验</span><span class="rw-muted">假设参数 · 非事故测量</span></div><label class="rw-slider-label">电势差 <output id="rw-v-out">${state.voltage.toFixed(1)} kV</output><input aria-label="电势差，千伏" data-param="voltage" type="range" min="0" max="10" step="0.1" value="${state.voltage}"></label><label class="rw-slider-label">等效电容 <output id="rw-c-out">${state.capacitance} pF</output><input aria-label="等效电容，皮法" data-param="capacitance" type="range" min="50" max="500" step="10" value="${state.capacitance}"></label><div class="rw-equation"><span>U = ½ C(ΔV)²</span><strong id="rw-energy-out"></strong></div><p class="rw-small">电容是储存电荷能力的参数，在这里作拓展使用。储能不等于实际火花能量；不能单凭这个数判断是否点燃。</p></div></section></div></div>`;
    updateSimulation();
  }

  function updateSimulation(){
    const complete=state.charge&&state.spark&&state.atmosphere;
    const out=container.querySelector('#rw-risk-state'); if(!out)return;
    out.textContent=complete?'点火条件可能相遇':'至少一个条件被移除';
    out.classList.toggle('rw-alert',complete);
    container.querySelector('.rw-causal-scene').classList.toggle('rw-chain-open',!complete);
    container.querySelector('.rw-causal-art .rw-spark').classList.toggle('rw-dim',!state.spark||!state.charge);
    const disabled=[]; if(!state.charge)disabled.push('电荷积累');if(!state.spark)disabled.push('有效放电');if(!state.atmosphere)disabled.push('可点燃气氛');
    container.querySelector('#rw-causal-feedback').textContent=complete?'三个条件都存在，也不等于每次必然点燃。实际过程还取决于局部条件。':`你移除了「${disabled.join('」「')}」条件。模型中的这条点火路径被切断；这不是对真实现场的安全结论。`;
    container.querySelector('#rw-v-out').textContent=state.voltage.toFixed(1)+' kV';
    container.querySelector('#rw-c-out').textContent=state.capacitance+' pF';
    container.querySelector('#rw-energy-out').textContent=(0.0005*state.capacitance*state.voltage**2).toFixed(2)+' mJ';
  }

  function onClick(event){
    const el=event.target.closest('button');if(!el||!container.contains(el))return;
    if(el.dataset.filter){filter=el.dataset.filter;renderWall();}
    else if(el.dataset.case){selected=el.dataset.case;renderWall();}
    else if(el.dataset.question){question=el.dataset.question;renderAnalysis();container.querySelector(`[data-question="${question}"]`)?.focus();}
    else if(el.dataset.action==='analyze'){selected=el.dataset.id||selected;question='what';if(onNavigate){onNavigate('analysis',selected);}else{renderAnalysis();container.querySelector('h1')?.scrollIntoView({block:'start',behavior:'smooth'});}}
    else if(el.dataset.action==='wall'){if(onNavigate){onNavigate('wall',selected);}else{renderWall();}}
    else if(el.dataset.action==='reset'){Object.assign(state,{charge:true,spark:true,atmosphere:true,voltage:3,capacitance:100});renderAnalysis();}
  }
  function onInput(event){
    const el=event.target;
    if(el.dataset.condition){state[el.dataset.condition]=el.checked;updateSimulation();}
    else if(el.dataset.param){state[el.dataset.param]=Number(el.value);updateSimulation();}
    else if(el.id==='rw-case-select'){selected=el.value;question='what';renderAnalysis();}
  }
  function onKeydown(event){
    if(event.target.getAttribute('role')!=='tab'||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    event.preventDefault();let index=QS.findIndex(q=>q[0]===question);
    index=event.key==='Home'?0:event.key==='End'?6:(index+(event.key==='ArrowRight'?1:6))%7;
    question=QS[index][0];renderAnalysis();container.querySelector(`[data-question="${question}"]`)?.focus();
  }
  container.addEventListener('click',onClick);container.addEventListener('input',onInput);container.addEventListener('keydown',onKeydown);
  mode==='analysis'?renderAnalysis():renderWall();
  return ()=>{if(disposed)return;disposed=true;container.removeEventListener('click',onClick);container.removeEventListener('input',onInput);container.removeEventListener('keydown',onKeydown);container.classList.remove('risk-root');};
}
