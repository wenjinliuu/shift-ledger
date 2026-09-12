# 循环班表 App Icon 设计源文件

当前处于图标方案探索阶段，在线比较页为 `/icon-lab/`。现有 iOS 图标暂不替换。

方案敲定后，这里保存不带系统圆角蒙版、阴影和玻璃材质的 1024×1024 SVG 分层源文件；
同一套图层会同步到 `ios/ShiftLedger/Resources/AppIcon.icon/Assets/`，由 Apple Icon Composer
负责 Default、Dark、Tinted 与 Clear 外观的材质渲染。

图层制作约束：

- 所有主体都按视觉重心校准，不只按 SVG 几何边界居中。
- 每个图层使用相同的 1024×1024 画布，避免合成时产生位移。
- 源 SVG 只保留纯几何与基础色；玻璃、投影、镜面高光写在 `icon.json`。
- 合成后必须检查 1024px、60px 和 40px 三种尺寸。
- 最终图标通过仓库的 `App Icon Preview` workflow 验证并导出完整预览包。
