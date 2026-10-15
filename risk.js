import {mountCaseScene} from './case-scene.js';
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
  {id:'esp',kind:'应用',date:'工程应用',place:'空气污染控制 · 静电除尘',title:'把颗粒从气流里“拉”出来',subtitle:'Electrostatic precipitator',tag:'粒子带电 · 电场收集',type:'collector',color:'teal',agency:'US EPA',certainty:'EPA 说明技术原理；照片是设备实拍，三维模型是简化机理演示。',summary:'静电除尘器使颗粒带电，利用电场把它们收集到极板，再将沉积物移除。',question:'气流向前，为什么颗粒能向侧面移动？',concept:'颗粒的速度方向可以与电场力方向不同；电场力改变它的运动。',chain:['颗粒获得电荷','电场施加力 F = qE','颗粒横向迁移','极板收集并清除'],unknown:'真实效率还依赖气流、粒径、颗粒电阻率和设备结构；本页面不预测除尘率。',facts:{what:'从气流中移除颗粒物。',why:'带电颗粒受到电场力，可向收集面迁移。',who:'放电电极、带电颗粒、收集极板和清灰系统。',when:'颗粒经过装置的运行过程。',where:'工业气体污染控制装置。',how:'带电 → 电场迁移 → 收集 → 清除。',much:'实际性能取决于多种参数，不由 qE 一个公式直接给出。'},lesson:'在粒子操控实验里练习控制轨迹，到了真实工程还需加上气流阻力与收集条件。'}
];

const REPORTS={desmoines:'https://www.csb.gov/assets/document/barton_case_study_-_9_18_2008.pdf',valley:'https://www.csb.gov/assets/1/20/CSB_Study_Barton_Final.pdf',glenpool:'https://www.ntsb.gov/investigations/AccidentReports/Reports/PAR0402.pdf',nasa:'https://nepp.nasa.gov/files/30202/EEE-Parts-Bltn_2018-v10-Issue2-2018Jun-to-2018Sept--ESD-Compendium-URS282874-CL19-2548.pdf'};
const COMMONS='https://commons.wikimedia.org/wiki/File:';
const MEDIA={
 fuelBond:{file:'fuel-bonding.jpg',title:'连接线和夹子，实物长什么样？',type:'燃油作业实物对照 · 非本次事故',caption:'R-11 加油车上的等电位连接电缆卷盘与夹子。资料说明电缆连接飞机与油车；照片只显示卷盘一端，不能据此确认另一端接在哪里。等电位连接与接地要分别辨认。',credit:'U.S. Air Force / Senior Airman Kevin Dunkleberger · 2025-06-04',license:'Public domain',source:'https://www.dvidshub.net/image/9114429'},
 spark:{file:'spark.jpg',title:'真正的静电火花',type:'实验实拍 · 非事故现场',caption:'两只金属球之间出现放电通道。这是静电发生器实验；火花的形态与尺度不能直接套用到事故。',credit:'Moses Nachman Newman',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',source:COMMONS+'Large_Discharge_Spheres_on_Quadruple_Bonetti_Machine.jpg'},
 tote:{file:'desmoines-p2-img0.png',title:'灌装时，哪些金属件没有连通？',type:'CSB 调查图 · 不是照片',caption:'Des Moines 调查报告图 1：钢罐、喷嘴、配重和泵的位置关系。图中的火花区域表示调查推断的可能路径。',credit:'U.S. Chemical Safety Board · 报告图 1 / PDF 第 2 页',license:'政府调查原图',source:REPORTS.desmoines+'#page=2'},
 bonding:{file:'desmoines-p4-img0.png',title:'等电位连接和接地，分别连到哪里？',type:'CSB 原理对照图',caption:'上：金属件彼此连接；中：物体与大地连接；下：两者结合。这里要检查的是每一个金属件，而非只看罐体。',credit:'U.S. Chemical Safety Board · 报告图 2 / PDF 第 4 页',license:'政府调查原图',source:REPORTS.desmoines+'#page=4'},
 valleyFire:{file:'valley-p1-img1.jpeg',title:'罐区火灾与正在作业的槽车',type:'本次事故实拍',caption:'2007 年 7 月 Valley Center 事故，CSB 调查报告封面照片。可见槽车、储罐与大范围燃烧；照片没有拍到最初的静电火花。',credit:'U.S. Chemical Safety Board · 2007-06-I-KS 报告封面',license:'公开调查报告摘图',source:REPORTS.valley+'#page=1'},
 valleyTank:{file:'valley-p3-img0.jpeg',title:'把照片中的系统拆开看',type:'CSB 装置图 / 浮子实物对照',caption:'报告图 1 展示储罐、接地、输送泵及液位浮子。图中浮子照片是同类零件示例，不是事故中原件的确认照片。',credit:'U.S. Chemical Safety Board · 报告图 1 / PDF 第 3 页',license:'政府调查原图',source:REPORTS.valley+'#page=3'},
 float:{file:'valley-p6-img0.jpeg',title:'可能放电的位置在罐内',type:'CSB 调查推断图',caption:'报告图 4 指向浮子连接处。CSB 将这里的火花列为最可能点火原因，不能当作直接拍摄到的火花。',credit:'U.S. Chemical Safety Board · 报告图 4 / PDF 第 6 页',license:'政府调查原图',source:REPORTS.valley+'#page=6'},
 glenpool:{file:'glenpool-p12-img0.jpeg',title:'11 号储罐留下的残骸',type:'本次事故后实拍',caption:'Glenpool 事故后的 11 号储罐，朝南拍摄。罐顶及罐壁已严重变形；它们说明事故后果，不能单独证明点火原因。',credit:'NTSB · PAR-04/02 · 图 2 / PDF 第 12 页',license:'公开调查报告摘图',source:REPORTS.glenpool+'#page=12'},
 glenpoolClose:{file:'glenpool-p12-img1.jpeg',title:'从另一个方向看残骸',type:'本次事故后实拍',caption:'NTSB 报告图 3。事故前曾移出汽油，随后灌入柴油；换入的液体与罐内残留气氛需要分别判断。',credit:'NTSB · PAR-04/02 · 图 3 / PDF 第 12 页',license:'公开调查报告摘图',source:REPORTS.glenpool+'#page=12'},
 chip:{file:'chip-package.jpg',title:'先看器件，再看损伤发生在哪里',type:'器件实拍 · 非下图受损样品',caption:'打开封装后的集成电路，可看见基底与细小连接。它用于辨认器件结构；下面 NASA 图像记录的是另一种薄膜电阻器件的放电损伤。',credit:'Eliran t',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',source:COMMONS+'Integrated_circuit.jpg'},
 damage:{file:'nasa-p14-img2.png',title:'显微镜里看见的放电损伤',type:'NASA 地面试验损伤图',caption:'NASA 资料中的氮化钽薄膜电阻扫描电镜图。激光切槽左侧可见内部电弧造成的损伤。不是航天器事故照片。',credit:'NASA Goddard / Scott M. Hull · ESD 汇编图 10 / PDF 第 14 页',license:'NASA 政府科研图像',source:REPORTS.nasa+'#page=14'},
 damageWide:{file:'nasa-p14-img0.png',title:'微小薄膜中的损伤范围',type:'NASA 地面试验损伤图',caption:'NASA 图 8 记录薄膜电阻网络芯片在地面试验中的 ESD 损伤。显微尺度下的薄膜破坏，外观不一定能直接看见。',credit:'NASA Goddard / Scott M. Hull · ESD 汇编图 8 / PDF 第 14 页',license:'NASA 政府科研图像',source:REPORTS.nasa+'#page=14'},
 strap:{file:'wrist-strap.jpg',title:'一条可控制的电荷流出路径',type:'防静电腕带实物',caption:'腕带、导线和夹子构成一条电气连接路径。它用于认识器件处理中的静电控制，实际接法与检验须遵照场所规程。',credit:'Evan-Amos / Vanamo Media',license:'Public domain',source:COMMONS+'AntiStatic-Wrist-Guard.jpg'},
 esp:{file:'esp-interior.jpg',title:'走进真正的静电除尘器',type:'设备内部实拍',caption:'中央细杆与周围蜂窝状收集面之间保留气流通道。颗粒通过时获得电荷并迁移到收集面；可见表面沉积物。',credit:'LukaszKatlewa · 2012',license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/',source:COMMONS+'Inside_of_the_electrostatic_precipitator.jpg'}
};
const STORIES={
 desmoines:{cover:'spark',gallery:['spark','tote','fuelBond','bonding'],observe:'先看火花把哪两个物体连了起来，再找调查图中被绝缘材料隔开的金属件。',steps:['开始灌装','孤立金属件带电','可能跨间隙放电','蒸气被点燃'],notes:['罐体接地，并不等于喷嘴上的每个金属件都已接地。','液体流动与接触分离可能产生电荷。孤立金属件没有畅通的流出路径。','CSB 认为金属组件与钢罐间的火花很可能点燃了开口处蒸气；具体路径是调查推断。','起火后液体继续流出，火势蔓延。三维画面只解释机理，不重现火焰尺度。'],concept:'两个物体即使都是金属，也可能处在不同电势。把它们可靠连通，才给电荷提供了重新分布的路径。',formula:'ΔV = V喷嘴 − V罐体',formulaText:'比较的是两者之差。把大地记为 0 V，不会自动让每个孤立零件都变成 0 V。'},
 valley:{cover:'valleyFire',gallery:['valleyFire','valleyTank','float','fuelBond','spark'],observe:'照片里能看到罐和车。真正需要追问的连接，却藏在罐里的浮子上。',steps:['输送溶剂','液体电荷难消散','浮子连接处可能放电','罐区爆炸与火灾'],notes:['本次输送的是低导电性 VM&P 石脑油。外部设备很可能已有效接地。','液体中的电荷不一定能像金属中的电荷那样迅速流走。','浮子松动的连接处是 CSB 提出的最可能火花位置。','照片呈现火灾后果；内部火花发生的具体瞬间没有被直接拍到。'],concept:'接地是建立电荷路径。只看到外壳接地，不能推出液体和内部每个零件都会立即消除电势差。',formula:'电荷能否流走 → 逐段检查路径',formulaText:'本例先判断液体、浮子、罐体之间是否连通。没有测量数据，就不虚构火花电压。'},
 glenpool:{cover:'glenpool',gallery:['glenpool','glenpoolClose','spark'],observe:'看被掀开的罐顶。再想：换进柴油后，罐内原有的汽油蒸气会立即消失吗？',steps:['原先装有汽油','移出汽油','开始灌入柴油','静电点火与爆炸'],notes:['11 号储罐此前装有汽油。模型用上部半透明区域表示需要考虑的气氛。','移走液体，不等于蒸气和残余液体也自动消失。','灌入柴油时仍要考虑残留气氛与输送产生的静电。','NTSB 的 probable cause 是不当储罐操作造成静电放电，点燃可燃混合物。'],concept:'风险取决于整个系统的状态：新液体、残留物、罐内气氛、流动及放电路径。',formula:'放电条件 ＋ 可点燃气氛 → 可能点火',formulaText:'这是一条定性条件链，没有把柴油名称当成“不会起火”的判据。蒸气显示开关仅改变画面。'},
 esd:{cover:'chip',gallery:['chip','damage','damageWide','strap'],observe:'先看封装里的细小连接，再翻到显微图：损伤发生在怎样的尺度？',steps:['物体积累电荷','接近器件','电荷快速转移','微小结构可能受损'],notes:['人体或工具可能带电。这个通用场景不对应某一次航天事故。','器件、人体与台面的电势可能不同。看不见火花也不等于没有电荷转移。','打开电荷流出路径，对照经过器件的路径和受控路径。模型只显示方向关系。','NASA 显微图来自地面试验。器件是否损伤还取决于型号、结构与放电条件。'],concept:'“人有没有感觉”与“器件有没有受损”是不同的问题。细小结构可能承受不了人难以察觉的放电。',formula:'电荷转移时，电势能会改变',formulaText:'ΔEp = qΔV 说明电荷与电势差有关。真实瞬态放电需要考虑电路与材料，不能仅用这一式判损坏。'},
 esp:{cover:'esp',gallery:['esp'],observe:'找中央细杆、周围收集面和中间气流通道。颗粒为什么能偏离气流方向？',steps:['颗粒随气流进入','颗粒获得电荷','电场改变运动','颗粒沉积在收集面'],notes:['气流带着颗粒向前运动。模型用可见小球表示颗粒，尺寸已放大。','高压放电电极让气体电离，颗粒获得电荷。这是带电过程，不只是吸引。','带电颗粒受到横向电场力，运动逐渐朝收集面偏移。','沉积颗粒需被清灰或冲洗移除。真实效率还受气流、粒径与颗粒电阻率等影响。'],concept:'电场力会改变粒子的运动。速度向前，受力可以向侧面；运动方向不必与受力方向相同。',formula:'F = qE',formulaText:'改变粒子电荷 q 或电场 E，就改变它受到的电场力。此处只比较趋势，不预测工程除尘效率。'}
};
const ORDER=['valley','glenpool','desmoines','esd','esp'];
const QS=[['what','WHAT','发生什么'],['why','WHY','原因证据'],['who','WHO','哪些对象'],['when','WHEN','何时发生'],['where','WHERE','发生何处'],['how','HOW','过程怎样'],['much','HOW MUCH','影响多大']];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external=(url,label)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
const photo=(id,cl='',lazy=true)=>`<img class="${cl}" src="assets/cases/${MEDIA[id].file}" alt="${esc(MEDIA[id].title+'；'+MEDIA[id].type)}" ${lazy?'loading="lazy"':''} decoding="async">`;

export function mountRisk(container,{mode='wall',caseId,onNavigate}={}){
 let selected=CASES.some(c=>c.id===caseId)?caseId:null;
 if(mode==='analysis'&&!selected)selected='valley';
 let filter='全部',question='what',imageIndex=0,scene=null,disposed=false;
 let state={step:0,bonded:false,grounded:true,liquid:'diesel',fieldOn:true,chargeOn:true,vaporVisible:true};
 container.classList.add('risk-root');
 const getCase=()=>CASES.find(c=>c.id===selected);
 const resetState=()=>{state={step:0,bonded:false,grounded:selected!=='esd',liquid:'diesel',fieldOn:true,chargeOn:true,vaporVisible:true};};
 const disposeScene=()=>{scene?.dispose();scene=null;};
 function credit(m){return `${esc(m.credit)} · ${m.licenseUrl?external(m.licenseUrl,m.license):esc(m.license)} · ${external(m.source,'原始资料')}`;}
 function overview(){
  disposeScene();selected=null;
  const shown=ORDER.map(id=>CASES.find(c=>c.id===id)).filter(c=>filter==='全部'||c.kind===filter);
  container.innerHTML=`<section class="rw-wall"><div class="rw-toolbar"><div class="rw-filters" role="group" aria-label="筛选照片">${['全部','事故','风险场景','应用'].map(f=>`<button data-filter="${f}" aria-pressed="${filter===f}">${f}</button>`).join('')}</div><span>先选照片 → 看过程 → 逐个追问</span></div><div class="rw-photo-wall">${shown.map((c,i)=>{let m=MEDIA[STORIES[c.id].cover];return `<button class="rw-photo-card ${i===0?'rw-featured':''}" data-case="${c.id}"><div class="rw-card-photo">${photo(STORIES[c.id].cover)}<span>${m.type}</span></div><div class="rw-card-copy"><div class="rw-card-meta"><span>${c.kind} · ${c.agency}</span><time>${c.date}</time></div><h2>${c.title}</h2><p>${c.subtitle}</p><strong>拿起照片，进入案例 <b>↗</b></strong></div></button>`;}).join('')}</div><p class="rw-wall-note">三起事故分别保留调查依据。火花实验、器件与设备照片单独标明；点击后，照片、三维过程和本案例的七问分析都在同一页。</p></section>`;
 }
 function analysis(c){return `<section class="rw-analysis" id="rw-analysis" aria-labelledby="rw-analysis-title"><div class="rw-section-heading"><span>03 / 对这个案例追问</span><h2 id="rw-analysis-title">${c.kind==='应用'?'这项技术，怎样发挥作用？':'这些结论，有什么依据？'}</h2><p>5W2H：一次看一个问题，答案始终对应「${c.subtitle}」。</p></div><div class="rw-seven" role="tablist" aria-label="本案例七问">${QS.map(([k,en,cn])=>`<button role="tab" aria-selected="${k===question}" tabindex="${k===question?0:-1}" aria-controls="rw-answer" data-question="${k}" id="rw-q-${k}"><strong>${cn}</strong><small>${en}</small></button>`).join('')}</div><div class="rw-answer" id="rw-answer" role="tabpanel" aria-labelledby="rw-q-${question}"><p>${c.facts[question]}</p><small>${question==='why'||question==='how'?c.certainty:'对应此案例资料，不套用其他案例的结论。'}</small>${external(sources[c.id],c.agency+' 原始依据')}</div><details class="rw-evidence"><summary>证据边界与未测得的信息</summary><p>${c.unknown}</p><p>${c.lesson}</p></details><label class="rw-note-label" for="rw-note">我的判断：哪个条件改变了？证据是什么？</label><textarea id="rw-note" rows="3" maxlength="1200" placeholder="用自己的话写一句判断。仅保存在当前浏览器。"></textarea><span class="rw-save" id="rw-save">观察笔记 · 当前浏览器保存</span></section>`;}
 function toggle(key,label,desc){return `<label class="rw-toggle"><input type="checkbox" data-state="${key}" ${state[key]?'checked':''}><span><b>${label}</b><small>${desc}</small></span></label>`;}
 function controls(c){
  if(c.id==='desmoines')return toggle('bonded','连通喷嘴金属件与罐体','观察电荷是否有连续的流出路径')+toggle('grounded','罐体连接大地','与喷嘴连接是两条不同的检查项');
  if(c.id==='valley')return toggle('bonded','让浮子连接保持导通','只对照这一条路径；不能消除液体中所有静电问题');
  if(c.id==='glenpool')return toggle('vaporVisible','显示罐内残留气氛','仅切换可视化，不改变事故的真实条件');
  if(c.id==='esd')return toggle('grounded','显示受控电荷流出路径','对照带电物体经器件放电的路径');
  return toggle('chargeOn','颗粒带电','关掉后 q = 0，电场力为零')+toggle('fieldOn','开启收集电场','关掉后 E = 0，横向电场力为零');
 }
 function detail(){
  disposeScene();const c=getCase(),s=STORIES[c.id],m=MEDIA[s.gallery[imageIndex]];
  container.innerHTML=`<article class="rw-workbench"><div class="rw-return"><button data-action="wall">← 放回照片墙</button><span>${c.kind} · ${c.date} · ${c.place}</span><a href="#rw-analysis">本案例 5W2H ↓</a></div><div class="rw-section-heading"><span>01 / 从看得见的证据开始</span><h2>${c.title}</h2><p>${c.subtitle}</p></div><div class="rw-evidence-layout"><section class="rw-gallery" aria-label="案例影像"><figure><button class="rw-photo-open" data-action="zoom" aria-label="放大当前资料图"><span class="rw-image-type">${m.type}</span>${photo(s.gallery[imageIndex],'rw-main-photo',false)}<span class="rw-enlarge">放大查看 ＋</span></button><figcaption><strong id="rw-image-title">${m.title}</strong><p id="rw-image-caption">${m.caption}</p><small id="rw-image-credit">${credit(m)}</small></figcaption></figure><div class="rw-thumbnails" aria-label="切换影像">${s.gallery.map((id,i)=>`<button data-image="${i}" aria-pressed="${i===imageIndex}">${photo(id)}<span>${MEDIA[id].title}</span></button>`).join('')}</div></section><aside class="rw-observation"><span class="rw-small-label">先看哪里</span><h3>${s.observe}</h3><p>${c.summary}</p><div class="rw-finding"><span>${c.kind==='事故'?'调查怎么说':'资料怎么说'}</span><p>${c.certainty}</p>${external(sources[c.id],c.agency+' 依据')}</div><a class="rw-primary" href="#rw-mechanism">到三维模型里看过程 ↓</a></aside></div><section class="rw-mechanism" id="rw-mechanism" aria-labelledby="rw-mechanism-title"><div class="rw-section-heading"><span>02 / 让看不见的过程显现</span><h2 id="rw-mechanism-title">${c.question}</h2><p>依次点四个阶段。可转动模型，再改变一个条件做对照。</p></div><div class="rw-model-layout"><div><div id="rw-model-host" class="rw-model-host" aria-label="本案例三维教学模型"></div><div class="rw-step-buttons" role="group" aria-label="过程阶段">${s.steps.map((x,i)=>`<button data-step="${i}" aria-pressed="${state.step===i}"><span>0${i+1}</span>${x}</button>`).join('')}</div><p class="rw-step-note" id="rw-step-note" aria-live="polite">${s.notes[state.step]}</p><small class="rw-model-limit">依据资料建立的定性教学模型；比例、粒子和放电过程经过简化，不是事故数值重建。</small></div><aside class="rw-model-reading"><span class="rw-small-label">改变一个条件</span><div class="rw-controls">${controls(c)}</div><p class="rw-change-note" id="rw-change-note" aria-live="polite"></p><div class="rw-formula"><span>连接到静电场</span><strong>${s.formula}</strong><p>${s.formulaText}</p></div><details class="rw-evidence"><summary>把概念说清楚</summary><p>${s.concept}</p></details></aside></div></section>${analysis(c)}<div class="rw-case-bottom"><button data-action="wall">← 回到照片墙</button><button data-action="next-case">再看一个案例 →</button></div><dialog class="rw-photo-dialog" aria-label="放大影像"><button data-action="close-zoom" aria-label="关闭放大影像">关闭 ×</button><img alt=""><p></p></dialog></article>`;
  if(c.id!=='esp')container.querySelector('.rw-model-reading').insertAdjacentHTML('beforeend','<p class="rw-evidence"><a href="charge.html#spark">先看金属球怎样积累电荷、产生火花 →</a><br>用独立实验理解过程，再回到本案例核对条件。</p>');
  const host=container.querySelector('#rw-model-host');scene=mountCaseScene(host,{caseId:selected,state:{...state}});
  try{container.querySelector('#rw-note').value=localStorage.getItem('electrostatic-case-note-'+selected)||'';}catch{}
  updateModel();
 }
 function updateModel(){
  if(!selected)return;const c=getCase(),s=STORIES[selected];scene?.update({...state});
  container.querySelectorAll('[data-step]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.step)===state.step)));
  container.querySelector('#rw-step-note').textContent=s.notes[state.step];
  let text='';
  if(selected==='desmoines')text=state.bonded?(state.grounded?'喷嘴 → 罐体 → 大地：模型中这条导电路径已连通。':'喷嘴与罐体连通，但整体仍与大地隔离；共同带电仍有可能。'):'罐体的接地线不能跨过喷嘴组件的绝缘间隔。观察孤立的金属件。';
  else if(selected==='valley')text=state.bonded?'模型让这处连接保持导通。低导电性液体的电荷仍需单独判断。':'罐体已接地，但浮子连接处可能隔断。这正是本案要追问的内部路径。';
  else if(selected==='glenpool')text=state.vaporVisible?'半透明区域提醒：移走汽油后，仍需要考虑罐内残留气氛。':'只隐藏了气氛图层；不能把“看不见”理解为“已经不存在”。';
  else if(selected==='esd')text=state.grounded?'显示通向受控接地点的路径。真实防护还需要合适器材和连接检验。':'观察带电物体与器件之间的电荷转移路径；没有人体痛感也可能损伤器件。';
  else text=state.step===0?'当前阶段：颗粒随气流进入，尚未呈现带电与横向电场力。':state.step===1?(state.chargeOn?'当前阶段：颗粒获得电荷。下一步再看电场力如何改变运动。':'当前阶段：带电过程已关闭，颗粒保持不带电。'):state.chargeOn&&state.fieldOn?'q 和 E 均存在：颗粒可在向前运动时受到横向力。':!state.chargeOn?'颗粒未带电：q = 0，本模型中电场力 F = 0。':'收集电场关闭：E = 0，本模型中电场力 F = 0。';
  container.querySelector('#rw-change-note').textContent=text;
 }
 function updateImage(){
  const s=STORIES[selected],m=MEDIA[s.gallery[imageIndex]],img=container.querySelector('.rw-main-photo');
  img.src='assets/cases/'+m.file;img.alt=m.title+'；'+m.type;
  container.querySelector('.rw-image-type').textContent=m.type;
  container.querySelector('#rw-image-title').textContent=m.title;container.querySelector('#rw-image-caption').textContent=m.caption;container.querySelector('#rw-image-credit').innerHTML=credit(m);
  container.querySelectorAll('[data-image]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.image)===imageIndex)));
 }
 function updateQuestion(){
  const c=getCase();container.querySelectorAll('[data-question]').forEach(el=>{el.setAttribute('aria-selected',String(el.dataset.question===question));el.tabIndex=el.dataset.question===question?0:-1;});
  const out=container.querySelector('#rw-answer');out.setAttribute('aria-labelledby','rw-q-'+question);out.innerHTML=`<p>${c.facts[question]}</p><small>${question==='why'||question==='how'?c.certainty:'对应此案例资料，不套用其他案例的结论。'}</small>${external(sources[c.id],c.agency+' 原始依据')}`;
 }
 function openCase(id){selected=id;question='what';imageIndex=0;resetState();detail();container.querySelector('.rw-workbench').scrollIntoView({block:'start',behavior:'smooth'});try{const url=new URL(location.href);url.searchParams.set('case',id);history.replaceState(null,'',url);}catch{}}
 function click(event){
  const el=event.target.closest('button');if(!el||!container.contains(el))return;
  if(el.dataset.case)openCase(el.dataset.case);
  else if(el.dataset.filter){filter=el.dataset.filter;overview();}
  else if(el.dataset.image!==undefined){imageIndex=Number(el.dataset.image);updateImage();}
  else if(el.dataset.question){question=el.dataset.question;updateQuestion();}
  else if(el.dataset.step!==undefined){state.step=Number(el.dataset.step);updateModel();}
  else if(el.dataset.action==='wall'){overview();container.scrollIntoView({block:'start',behavior:'smooth'});try{let url=new URL(location.href);url.searchParams.delete('case');history.replaceState(null,'',url);}catch{}}
  else if(el.dataset.action==='next-case')openCase(ORDER[(ORDER.indexOf(selected)+1)%ORDER.length]);
  else if(el.dataset.action==='zoom'){const m=MEDIA[STORIES[selected].gallery[imageIndex]],d=container.querySelector('dialog');d.querySelector('img').src='assets/cases/'+m.file;d.querySelector('img').alt=m.title;d.querySelector('p').textContent=m.caption;d.showModal();}
  else if(el.dataset.action==='close-zoom')container.querySelector('dialog').close();
 }
 function input(event){const el=event.target;if(el.dataset.state){state[el.dataset.state]=el.checked;updateModel();}else if(el.id==='rw-note'){try{localStorage.setItem('electrostatic-case-note-'+selected,el.value);container.querySelector('#rw-save').textContent='已保存到当前浏览器';}catch{container.querySelector('#rw-save').textContent='当前浏览器无法保存，可复制文字留存';}}}
 function keydown(event){if(event.target.getAttribute('role')!=='tab'||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();let n=QS.findIndex(x=>x[0]===question);n=event.key==='Home'?0:event.key==='End'?6:(n+(event.key==='ArrowRight'?1:6))%7;question=QS[n][0];updateQuestion();container.querySelector(`[data-question="${question}"]`).focus();}
 container.addEventListener('click',click);container.addEventListener('input',input);container.addEventListener('keydown',keydown);
 if(selected){resetState();detail();}else overview();
 return ()=>{if(disposed)return;disposed=true;disposeScene();container.removeEventListener('click',click);container.removeEventListener('input',input);container.removeEventListener('keydown',keydown);container.classList.remove('risk-root');};
}




