// Original Chinese teaching copy. Expand one card at a time beside the live scene.
export const LEARNING_CARDS = [
  {
    id: 'field-force-velocity',
    title: '它朝哪儿走，和它正被推向哪儿，是两回事',
    body: '电场 E 描述这里会怎样作用于电荷；电场力 F = qE 改变粒子的速度；速度 v 才指向它此刻前进的方向。电子带负电，受力与 E 反向。暂停轨迹，对比这三个箭头：轨迹切线沿 v，不必沿 E。改动一次电荷后再发射，看看变化先出现在受力，还是位置。'
  },
  {
    id: 'superposition',
    title: '每个电荷都有贡献，空间里只得到一个合场',
    body: '固定探针，分别查看各个源电荷产生的 E，再查看矢量和。同样大的两个贡献可能加强，也可能抵消；移到另一个位置，结果又会改变。电势 V 则按带正负号的数值相加。这个模型中的源是均匀带电绝缘球：球外的场与位于球心的同电量点电荷相同；它们不代表金属电极。'
  },
  {
    id: 'potential-energy',
    title: '电势告诉你能量怎样换账',
    body: '这里选择无穷远处 V = 0。粒子的电势能 U = qV；固定源构成的静电场中，电场做功 W = −ΔU，只有电场做功时 ΔK = −qΔV。电子进入更高电势时，电势能降低、动能增加。二维切片展示三维空间中一个面的数据，不能把电势色彩或高度误当成真实地形；还要检查垂直切片的场分量。'
  },
  {
    id: 'gauss-flux',
    title: '总通量为零，这里仍然可以有电场',
    body: '封闭面的每小块都在计算 E 与外法线方向的配合：正值表示净穿出，负值表示净穿入。相加得到 Φ = Q内/ε₀。没有包住净电荷时，穿入与穿出可以相抵，总通量为零不等于每处 E 为零。改变面的形状，局部贡献会变；若包住的净电荷不变，总通量保持不变。要直接由此求 E，还需要足够的对称性。'
  }
];

export const MISSIONS = [
  {
    id: 'steer-y',
    title: '01 · 让轨迹偏向目标',
    prompt: '先预测电子会偏向哪一侧，再调整源电荷，让它穿过目标区域。',
    focus: '先固定发射速度和粒子类型，只调整一个源电荷。',
    reflection: '暂停在弯曲最明显的位置：速度、受力、电场三个箭头是否同向？',
    hints: ['电子的电荷为负。先看 E，再判断 F。', '吸引或排斥会连续改变速度，粒子不会瞬间转向目标。']
  },
  {
    id: 'steer-yz',
    title: '02 · 目标藏在画面深处',
    prompt: '目标同时偏离上下方向和前后方向。调整空间中的源电荷，让电子在三维空间命中。',
    focus: '用正视与俯视交叉判断，再回到三维视角检查同一条轨迹。',
    reflection: '一张投影图上看似命中，另一张为什么可能偏离？',
    hints: ['先处理一个横向分量，再检查另一个。', '切换视角只改变观察方式，轨迹和读数不应改变。']
  },
  {
    id: 'compare-particle',
    title: '03 · 同一个场，为什么不再命中？',
    prompt: '保留源电荷，先改变发射速度重放；再保持速度、质量不变，仅切换电荷正负。',
    focus: '一次只改一个因素，保存前一次轨迹作为比较。',
    reflection: '更快的粒子在偏转区域停留多久？电荷反号后，哪个箭头先反向？',
    hints: ['初速度增加会改变通过时间和路径；不要假设任意复杂场中偏转总按同一比例变化。', '“正电试验粒子”保持电子质量，只用于隔离电荷符号的影响；它不是质子。']
  }
];

export const PARTICLE_LABELS = {
  electron: '电子：q = −e，质量 mₑ',
  positiveTest: '正电试验粒子：q = +e，质量仍为 mₑ（非质子）',
  note: '源电荷保持固定；忽略粒子对源的反作用、辐射和碰撞。显示粒子与轨迹经过放大，动画时间经过慢放。'
};

export const APPLICATIONS = [
  {
    id: 'crt',
    title: '把电子送到屏幕上的指定位置',
    body: '静电偏转型阴极射线管用电场改变电子束的路径，落到屏幕的位置随之改变。这里的操纵任务对应“改变场 → 改变轨迹 → 改变落点”。真实管内使用电极，当前绝缘带电球模型只展示共同物理原理。',
    sourceLabel: '爱荷华大学 · 电子束的静电偏转',
    sourceUrl: 'https://instructional-resources.physics.uiowa.edu/5h3015-electrostatic-deflection-electron-beam'
  },
  {
    id: 'electron-optics',
    title: '用电势分布调控电子束',
    body: '电子光学用电极形成的电势分布控制电子。Einzel 静电透镜的入口与出口电势相同，经过透镜后粒子的方向仍可改变；仅有静电力时，入口与出口动能相同。这提醒我们：能量相同，并不代表轨迹相同。',
    sourceLabel: 'JEOL · Einzel 静电透镜',
    sourceUrl: 'https://www.jeol.com/words/emterms/20121023.000300.php'
  }
];

// About 60–75 seconds at a natural pace; a script, not generated audio.
// Two respectful perspectives: intuitive learner and physics-trained partner.
export const DIALOGUE = [
  { speaker: '学习者', text: '我把电场箭头指向目标，电子怎么往另一边偏？' },
  { speaker: '物理同伴', text: '先暂停。箭头表示正电荷的受力方向，电子带负电，它的受力方向正好相反。' },
  { speaker: '学习者', text: '那把箭头反过来，电子就沿着它走？' },
  { speaker: '物理同伴', text: '还要看它原来的速度。电场改变速度，轨迹得一步一步积累。看看受力箭头和速度箭头，它们现在同向吗？' },
  { speaker: '学习者', text: '不一样！我刚才只顾着对准目标了。' },
  { speaker: '物理同伴', text: '现在只提高发射速度，场保持不变。先猜落点，再发射。' },
  { speaker: '学习者', text: '它经过这片区域更快了，所以受到的影响时间也变了。' },
  { speaker: '物理同伴', text: '对。再旋转视角：正面看着到位，深度方向也到位了吗？' },
  { speaker: '学习者', text: '还差一截！我要操纵的是整个空间里的轨迹。' },
  { speaker: '物理同伴', text: '这也是电子束控制的核心问题。现在换你来：只改一个源电荷，让下一次更接近目标。' }
];
