# 事故、风险与应用：来源和表达边界

核查日期：2026-10-14。图形均为自绘原理示意，无事故现场照片或几何复原主张。

1. **Barton Solvents，Des Moines，2007-10-29**。CSB 调查认定静电火花引发火灾；喷嘴金属件向钢罐放电的具体路径仍用“很可能”。[CSB 原文](https://www.csb.gov/csb-finds-static-spark-set-off-fire-and-explosions-at-barton-solvents-des-moines-facility-investigation-finds-equipment-not-intended-for-flammable-service-or-properly-bonded-and-grounded/)。页面只简述灌装、隔离金属件、火花、蒸气与后果。
2. **Barton Solvents，Valley Center，2007-07-17**。CSB 最可能原因是浮子连接处静电火花；外部输送设备很可能已有效连接与接地。不得与上例混同，也不得说接地完全防止所有内部静电风险。[CSB 原文](https://www.csb.gov/csb-issues-final-report-on-barton-solvents-explosion-calls-on-osha-and-trade-associations-to-improve-material-safety-data-sheets-for-nonconductive-flammable-liquids-safety-video-with-animation-released/)。[调查主页](https://www.csb.gov/barton-solvents-explosions-and-fire/)。
3. **ConocoPhillips，Glenpool，2003-04-07**。NTSB probable cause 为不当储罐操作导致静电放电，点燃可燃混合物；此前汽油被移出，正在灌入柴油。[NTSB 调查摘要](https://www.ntsb.gov/investigations/Pages/DCA03MP001.aspx)。
4. **敏感电子硬件 ESD**。这是风险场景，不是事故案例。NASA 明确表示人难以感知的微小放电也可能伤害敏感硬件；不补写具体航天器事故。[NASA 视频说明](https://sma.nasa.gov/vids/video-item/electrostatic-discharge-overview)。
5. **静电除尘**。EPA 原理：颗粒带电、受电场作用、极板收集并清除。实际性能受到气流、颗粒电阻率等因素影响，页面不预测收集效率。[US EPA](https://www.epa.gov/air-emissions-monitoring-knowledge-base/monitoring-control-technique-electrostatic-precipitators)。

## 交互模型

- 5W2H 的“已知/推断/未知”跟随调查文字，不把推断写成直接观察。
- 点火链的三个开关是抽象条件有无，不是设备安全控制方案。三个条件齐全仅显示“可能相遇”，没有自动断言必然点燃；移除条件也不显示“现场安全”。
- 储能演示 U = 1/2 C(ΔV)^2。C 单位 pF、ΔV 单位 kV，转换为 mJ 后 U = 0.0005 × C × (ΔV)^2。默认 C = 100 pF、ΔV = 3 kV，U = 0.45 mJ。所有参数是教学假设，未从事故后果反推出参数。储存能量不等于全部转移到火花的能量。
- 本节电容与储能作为拓展，核心目标仍是带电、导体、放电条件、电势差与系统后果。

## 集成

模块：`risk.js` 导出 `mountRisk(container, {mode:'wall'|'analysis', caseId?:string, onNavigate?:(mode,caseId)=>void})`，返回清理函数。加载 `risk.css`。独立 DOM，不依赖框架或网络资源。风险墙中的“用 5W2H 拆开”如有 onNavigate 回调则交由根导航，否则在当前容器中切换；根页面也可分别直接挂载两种模式。caseId 为 desmoines / valley / glenpool / esd / esp。
