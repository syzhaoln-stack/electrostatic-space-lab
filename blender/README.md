# 事故教学装置 · Blender 源模型

这组资产是依据调查示意图建立的**原创定性教学模型**，用于看清部件、电荷转移路径和放电位置。尺寸为教学布局选取；它不是事故设备的测量复原，也不提供事故瞬时电压、放电能量或爆炸计算。

## 文件

- `desmoines.blend` / `../assets/models/desmoines.glb`：方形便携钢制容器、秤台、输送泵、软管、喷嘴、绝缘接头、配重、连接线。
- `tank.blend` / `../assets/models/tank.glb`：钢制储罐、分层壳板和焊缝、锥顶、法兰、手轮阀、入料管、固定梯、基础、液面浮子与液位连接。
- 两份同名 JSON：Godot 坐标、建议相机、尺寸、独立节点名、剖开时隐藏的节点、放电效果的教学参考位置。
- `*-preview.png`：Cycles 渲染，展示拆除前面板的教学切面。预览灯光、地面和相机不在 GLB 中。

## 约定

GLB 使用米、Y 向上、正面朝 +Z；地面 Y=0。Blender 源采用默认 Z 向上，官方 glTF 导出器转换坐标。

Des Moines 容器主体宽 1.30 m、深 1.12 m，上表面 Y=1.455 m。金属喷嘴、橡胶软管、绝缘接头、配重、黄色等电位线、绿色接地线是独立节点。`container_front` 是可移除前面板；其标签等装饰是该节点的子级。材质使用 glTF 标准 PBR，不依赖外部纹理。

共用储罐半径 1.45 m，壳体顶 Y=3.12 m，屋顶尖 Y=3.40 m。隐藏 `tank_front` 和 `tank_roof_front` 可观察内部；前面焊缝是前面板的子级。浮子是浅金属盘与跨接桥架，依据 Valley 报告中的浮子实物与示意图建模。

**Glenpool 场景必须隐藏浮子和液位连接系统**，具体节点前缀见 `tank.json` 的 `glenpool_hide`。不能把 Valley 的浮子点火路径套到 Glenpool。共用模型仅代表储罐与灌注的共同装置结构，不表示两起事故设备一致。

JSON 中 `spark_start`/`spark_end` 是教学效果挂点，不是调查测得的真实间隙尺寸。泵的翅片、阀门手轮、紧固件和材料表面为增强辨识而补充的典型工业细节，不是对原设备品牌或型号的认定。

## 参考

- 本地资料：`assets/cases/desmoines-p2-img0.png`、`desmoines-p4-img0.png`，CSB 灌装系统及连接/接地示意。
- 本地资料：`assets/cases/valley-p3-img0.jpeg`，CSB 浮子实物与储罐机制示意。
- 本地资料：`assets/cases/glenpool-p12-img0.jpeg`，事故现场资料；不据损毁照片反推未提供的原罐尺寸。
- [CSB：Des Moines 事故调查说明](https://www.csb.gov/csb-finds-static-spark-set-off-fire-and-explosions-at-barton-solvents-des-moines-facility-investigation-finds-equipment-not-intended-for-flammable-service-or-properly-bonded-and-grounded/)
- [CSB：Valley Center 调查报告说明](https://www.csb.gov/csb-issues-final-report-on-barton-solvents-explosion-calls-on-osha-and-trade-associations-to-improve-material-safety-data-sheets-for-nonconductive-flammable-liquids-safety-video-with-animation-released/)
- [NTSB：Glenpool 调查记录](https://www.ntsb.gov/investigations/Pages/DCA03MP001.aspx)

## 重新生成

已在 Blender 4.5.13 LTS 验证：

```powershell
& 'D:\Software\Blender\blender-4.5.13-windows-x64\blender.exe' --background --factory-startup --python blender/build_assets.py -- desmoines
& 'D:\Software\Blender\blender-4.5.13-windows-x64\blender.exe' --background --factory-startup --python blender/build_assets.py -- tank
```

脚本先导出仅含设备的 GLB，再建立预览摄影棚并保存 blend；因此应使用脚本重新导出，不要直接全选预览场景导出。
