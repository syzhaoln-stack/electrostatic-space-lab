# 事故与应用：影像、机理与逐案分析

更新：2026-10-14。

本轮按桥梁事故照片展台的学习顺序重构：**先选真实影像 → 观察与调查证据 → 同一案例的三维过程 → 本案例的 5W2H → 自己写判断**。不再把所有案例放进一个通用的储能滑块模型。

## 页面与交互

- `cases.html` 默认显示照片墙，点击照片进入案例工作台；五个案例都含可见资料图、可放大影像、逐图图注、过程分步、三维机理及七问分析。
- `cases.html?case=valley` 等链接可直达具体案例；`analysis.html?case=...` 保留兼容入口，显示同一套工作台。
- `risk.js` 仍导出 `mountRisk(container, {mode, caseId, onNavigate})`，返回清理函数；内部使用 `mountCaseScene`，选案和卸载时释放场景。`onNavigate` 保留参数兼容，当前案例内不再跳转到通用分析页。
- 5W2H 标签键盘支持左右键、Home、End。放大图用原生 dialog，支持 Esc 关闭。笔记只写入当前浏览器本地存储。
- 模型的每一步由用户点选。对照开关只表达相应模型条件，不能当作现场安全验收。

## 14 项影像与出处

完整资产台账：`assets/cases/manifest.json`。资料图片本地化，共约 3.1 MB，浏览不依赖外站图片服务。

1. **Valley Center 火灾现场**：CSB《Barton Solvents Static Spark Ignites Explosion Inside Flammable Liquid Storage Tank》封面。真实事故摄影，可见槽车、罐区与燃烧；不将其称为最初火花照片。另有报告图 1 装置与同类浮子对照、图 4 浮子连接处可能放电机理。
2. **Glenpool 储罐残骸**：NTSB PAR-04/02 图 2、3（PDF 第 12 页）。真实事故后照片；残骸能说明后果，不能仅凭外观判定原因。
3. **Des Moines 灌装**：CSB 2008-02-I-IA 图 1、2（PDF 第 2、4 页）。这两幅都是调查图／原理图，明确标注“不是照片”。未找到可确认授权与事件对应的现场照片，因此用真实静电发生器放电照片作机理对照，醒目标“非事故现场”；不挪用 Valley Center 火灾照片。
4. **真实火花**：Moses Nachman Newman 的 Bonetti 静电发生器实拍，CC BY 4.0，原始 JPEG。只显示放电现象，不套用其尺度到事故。
5. **集成电路实物**：Eliran t，CC BY-SA 4.0，来源站 960 px 缩略图；用于说明封装内细小结构，不称为 NASA 受损样品。
6. **NASA 损伤显微图**：NASA EEE Parts ESD Compendium 中图 8、10（PDF 第 14 页），原作者 Scott M. Hull / NASA Goddard；薄膜电阻网络芯片地面试验损伤与氮化钽薄膜电阻内部电弧损伤。没有虚构航天器事故。
7. **防静电腕带实物**：Evan-Amos / Vanamo Media，自行释放至公有领域，原始 JPEG。
8. **燃油作业等电位连接电缆实物**：U.S. Air Force / Kevin Dunkleberger，2025-06-04，DVIDS image 9114429，Public domain。显示 R-11 加油车卷盘和夹子，明确不是事故现场；照片未显示电缆另一端，不能仅凭照片断言接地点。
9. **静电除尘器内部**：LukaszKatlewa，CC BY-SA 3.0，来源站 960 px 缩略图；可见电极、收集面与沉积物。机理以 EPA 说明为依据。

照片与调查原图未做生成式编辑，未补画或制造现场细节。报告中未逐图列独立摄影权属的火灾、残骸照片标为“公开调查报告摘图”，用于当前私有教学审阅；没有将整份官方报告的所有摄影笼统标为公有领域，正式出版前应逐图完成许可核验。CC 图片已在图下注明作者、原页、许可链接。

## 案例事实与科学边界

- Des Moines（2007-10-29）与 Valley Center（2007-07-17）是两起事故。前者金属组件与罐体之间的具体火花路径为 CSB 推断；后者浮子连接火花是“最可能原因”。
- 接地与金属件之间的等电位连接分别呈现。外壳接地不自动代表内部液体或隔离零件快速消除电荷。
- Glenpool 模型依次呈现此前汽油、移出汽油、柴油进入、点火后果；“显示残留气氛”仅控制图层，不是清除真实气氛。
- ESD 模型对照器件路径与受控电荷流出路径，不以人体有无痛感判器件损伤，不给出统一损坏电压。
- 除尘模型对照 q = 0 或 E = 0 时的电场力，说明 F = qE。可视粒子放大，运动为定性演示，不预测除尘率。
- 不再出现所有事故共用的任意电容／电压／储能滑块，以免把假设量伪装成调查参数。

## 一手依据

- [CSB Des Moines 结论](https://www.csb.gov/csb-finds-static-spark-set-off-fire-and-explosions-at-barton-solvents-des-moines-facility-investigation-finds-equipment-not-intended-for-flammable-service-or-properly-bonded-and-grounded/)
- [CSB Des Moines 报告](https://www.csb.gov/assets/document/barton_case_study_-_9_18_2008.pdf)
- [CSB Valley Center 报告](https://www.csb.gov/assets/1/20/CSB_Study_Barton_Final.pdf)
- [NTSB Glenpool 报告](https://www.ntsb.gov/investigations/AccidentReports/Reports/PAR0402.pdf)
- [NASA ESD 科普](https://sma.nasa.gov/vids/video-item/electrostatic-discharge-overview)
- [NASA ESD 损伤汇编](https://nepp.nasa.gov/files/30202/EEE-Parts-Bltn_2018-v10-Issue2-2018Jun-to-2018Sept--ESD-Compendium-URS282874-CL19-2548.pdf)
- [EPA 静电除尘](https://www.epa.gov/air-emissions-monitoring-knowledge-base/monitoring-control-technique-electrostatic-precipitators)

## 本轮验证

五个案例的三维画布、阶段按钮、条件对照与 5W2H 已逐个运行；全部 14 项本地图片加载通过。照片墙和主要案例在 1440 px、390 px 无横向溢出。分析标签键盘切换、笔记刷新保存、影像放大和 Esc 关闭通过。未发现页面运行错误。除尘提示已按阶段区分进入、带电和受力。

