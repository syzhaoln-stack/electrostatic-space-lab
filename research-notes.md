# 教学文案与来源核对

核对日期：2026-10-14。此文件记录编辑证据，不作为学生界面的长篇说明。`learning-content.js` 为原创中文文案，可直接导入页面。

## 交互与概念边界

- 三步任务：单方向偏转 → 真正的 y / z 双方向目标 → 保持场不变，比较初速度或电荷符号。每次仅改变一个因素，保留前一次轨迹。
- 电场箭头 E、受力箭头 F、速度箭头 v 必须分色并带标签。轨迹切线沿 v；F = qE 决定加速度；电子的 F 与 E 反向。不能将轨迹标成电场线。
- 正电选项保持 mₑ，仅改变电荷符号，明确为“正电试验粒子（非质子）”。不能展示为质子；真实质子质量不同。
- 固定源为均匀带电绝缘球。球外场与球心同电量点电荷等效；球内应采用均匀体电荷分布解。若模型在接触球面时终止，球内解只是连续场求值，不意味着电子可无碰撞穿越实物。
- 当前模型不模拟导体感应；不能把这些球画成等势金属电极并以其为电极边界解。
- 电势零点选无穷远；单粒子在固定静电场中 U = qV、ΔK = −qΔV。若仅受电场力，K + U 保持恒定，可用于数值检查。
- 电势高度图的纵轴是 V；真实空间纵轴是 z。切片丢失的法向场分量应可查看。投影、切片不可混称。
- 高斯定理适用于任意封闭面；对称性限制的是“便捷地从通量求 E”的方法，而非定理本身。总通量为零不意味着局部 E 为零。

## 两项真实应用

1. **阴极射线管的静电偏转**：爱荷华大学物理演示目录《5H30.15 — Electrostatic Deflection of Electron Beam》。官方页面明确分类为电子束的静电偏转。链接：https://instructional-resources.physics.uiowa.edu/5h3015-electrostatic-deflection-electron-beam 。只能借鉴“电场控制电子落点”的原理，当前绝缘球场景不是 CRT 结构复原。普通电视的磁偏转不能一并说成静电偏转。
2. **电子光学与 Einzel 透镜**：JEOL 制造商官方术语页《einzel lens》。入口和出口电势相同，通常为三个电极，中央电极电势与两端不同，仍产生透镜作用。链接：https://www.jeol.com/words/emterms/20121023.000300.php 。原文还指出离子束仪器用途。文案只使用“静电透镜改变路径、入口出口无净动能变化”的共同原理，不把页面模型描述成已实现该透镜。

补充来源：JEOL《electrostatic lens》解释 SEM 电子束的加速与减速，https://www.jeol.com/words/semterms/20121024.051158.php 。本页证据只支持电子光学应用，不支持任意场景都由静电聚焦、也不支持本模型的数值精度。

检索排除：爱荷华大学另一页面 5H30.10 主要演示磁场偏转，已明确排除，避免仅凭“electron beam”标题误用。

## 豆包双人对话早期记录（已由第三版状态更新）

已提供 `DIALOGUE` 十轮短对话，预计自然语速约 60–75 秒；未生成音频、未试听，不能将估时作为实际成片长度。

本地 `C:/Users/zhaos/.codex/skills/construction-safety-video/` 内发现 `scripts/doubao_tts.py` 与 `references/generation-apis.md`。已阅读相关说明。它支持豆包非流式音频生成 `/api/v3/tts/create`，脚本固定单预设音色与 WAV 输出，是单人配音 helper，不是双人播客 skill。未读取或输出凭据、未发送请求、未产生音频。

本地技能目录没有检索到已安装的双人播客 skill。之前规划中已有字节官方 `byted-podcast-gen` 参考，本轮不因用户催促而用浏览器语音冒充豆包。页面应将当前对话标为文字脚本；未生成时不放虚假的播放按钮。

## 2026-10-15 第三版补充

最新语音状态以 README 与 media/podcast-status.json 为准：已生成豆包双音色十轮对话，73.98 秒，使用既有语音 helper 逐轮合成并拼接，非 PodcastTTS 自动改写；上述“未生成”仅为早期过程记录。

### Manim 与动态电场

已读本地 manimgl-best-practices/examples/vector_fields.py 的 ElectricDipole，以及 references/vector_fields.md 的 StreamLines 示例。借鉴的是向量场、流线和移动标记的可读性，网页采用 Three.js 实时计算；没有生成或嵌入冒充本站实时仿真的 Manim 录像。

- Manim 官方 StreamLines：https://docs.manim.community/en/stable/reference/manim.mobject.vector_field.StreamLines.html 。流线随向量场积分，用流动标记帮助识别方向；标记不能当成电荷轨迹。
- 3Blue1Brown 官方《How wiggling charges give rise to light》：https://www.3blue1brown.com/lessons/barber-pole-2/ ，YouTube https://www.youtube.com/watch?v=aXRTczANuIs 。已核对官方标题与入口，未声称完整观看或复刻原片。
- Feynman I-28：https://www.feynmanlectures.caltech.edu/I_28.html 。传播页采用低速电偶极近似的远区辐射项，包含光速迟滞；近 Coulomb 项与感应项不画。手拖源页面仍是静电快照，二者单独呈现。
- OpenStax 5.6：https://openstax.org/books/university-physics-volume-2/pages/5-6-electric-field-lines 。静电场线不能因借鉴流体纹理而画成涡旋；颜色/移动标记不能混称粒子运动。
- OpenStax 7.5：https://openstax.org/books/university-physics-volume-2/pages/7-5-equipotential-surfaces-and-conductors 。电场法向于等势面；沿面移动时电场力功为零。网页指定路径由外力控制，不是自由轨迹。

### 导体球与放电

新模块与前四页绝缘球模型分开：等半径导体球，左球电势 V、右球接地；交替 Kelvin 镜像求等势边界。支架、接线和空气电离不包含在边值解里。独立数值检验覆盖球面等势、切向场、Q/C/V 和能量；独立球外通量积分相对误差约 9.7×10⁻⁷。

- OpenStax 8.5：https://openstax.org/books/university-physics-volume-2/pages/8-5-molecular-model-of-a-dielectric 。空气击穿典型量级约 3 MV/m，用于教学触发；不是所有间隙与环境都可套用的常数。
- OpenStax 7.2：https://openstax.org/books/university-physics-volume-2/pages/7-2-electric-potential-and-potential-difference 。功与电势差关系。
- 真实火花图与授权：https://commons.wikimedia.org/wiki/File:Large_Discharge_Spheres_on_Quadruple_Bonetti_Machine.jpg 。标明为实验实拍、非本模型装置，不能当成同尺寸装置的验证照片。

20 m 是传播画面的内侧展示截断，非普适的近远区分界；实际近远区取决于波长。源振幅在画面放大 350 倍，时间慢放；波形数值保持 SI 单位计算。电场/磁场/传播方向相互关系与符号独立审核。

### 用户指定的视觉参考（2026-10-15）

https://www.youtube.com/watch?v=81QNyDnYtg0 为3Blue1Brown《Simulating the electric field and a moving charge》，已从YouTube可见页面核对标题、作者及它链接到aXRTczANuIs的关系。播放器播放/截图控制未稳定完成，不声称完整观看。用户随后提供aXRTczANuIs 0:39画面截图作为直接视觉依据：纯黑背景、低机位XZ水平采样面、竖直蓝色矢量的透视阵列、珊瑚红源和少量细轴。

官方原动画源路径现为 https://github.com/3b1b/videos/blob/master/_2023/optics_puzzles/e_field.py 与 objects.py；旧barber_pole源路径失效。根据源码核对固定采样箭头原地更新、弱场淡出、先整体后局部和脉冲之间的停顿。本站是独立实现，保留每个模型的物理适用边界。
