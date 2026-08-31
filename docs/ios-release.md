# 循环班表 iOS 上架指南

本项目通过 [Capacitor](https://capacitorjs.com/) 把现有的 Next.js 静态站点打包成
原生 iOS 应用：网页代码继续是唯一的一份实现，`ios/` 目录是提交到 App Store 的
Xcode 工程。所有排班数据仍然只保存在设备本机。

## 一、现状速览

| 项目 | 值 |
| --- | --- |
| Bundle ID | `com.wenjinliu.shiftledger` |
| App 名称（桌面显示） | 循环班表 |
| 版本 / Build | `MARKETING_VERSION = 1.0.0`，`CURRENT_PROJECT_VERSION = 1` |
| 设备 | 仅 iPhone（`TARGETED_DEVICE_FAMILY = 1`），仅竖屏 |
| 最低系统 | iOS 15.0 |
| 原生插件 | Filesystem、Share、SplashScreen、StatusBar |
| 隐私清单 | `ios/App/App/PrivacyInfo.xcprivacy`（无数据收集、无跟踪） |
| 隐私政策页 | `/privacy/`，线上地址 https://wenjinliuu.github.io/shift-ledger/privacy/ |

改 Bundle ID、应用名等信息请改 `capacitor.config.ts` 后重新 `npm run ios:sync`；
版本号在 Xcode 的 target → General 里改（或直接改 `project.pbxproj` 的
`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`）。

## 二、本地环境要求

- macOS + Xcode 16 及以上（App Store 目前要求用 iOS 18 SDK 构建）
- Node.js 20.9 以上
- Apple Developer Program 会员（个人 99 美元/年）——账号审核通过后才能真机调试与上架

> 依赖用 Swift Package Manager 管理（`ios/App/CapApp-SPM`），不需要安装 CocoaPods。

## 三、构建流程

```bash
npm ci
npm run ios:sync   # 等价于 next build（静态导出到 out/）+ cap sync ios
npm run ios:open   # 打开 ios/App/App.xcodeproj
```

要点：

- `ios/App/App/public` 是构建产物，已被 `.gitignore` 忽略；**每次改完网页代码都要重新
  `npm run ios:sync`**，否则 Xcode 里跑的还是旧页面。
- iOS 打包必须用不带 `NEXT_PUBLIC_BASE_PATH` 的默认构建（GitHub Pages 才需要 base path）。
- 图标与启动图源文件在 `assets/`（`icon.png` 1024×1024、`splash.png` / `splash-dark.png`
  2732×2732）。换图后运行：
  ```bash
  npx @capacitor/assets generate --ios --assetPath assets
  ```

## 四、Xcode 里要做的一次性配置

1. 选中 `App` target → **Signing & Capabilities**
   - 勾选 Automatically manage signing
   - Team 选自己的开发者账号（审核通过后才会出现）
   - 确认 Bundle Identifier 为 `com.wenjinliu.shiftledger`（需与 App Store Connect 一致）
2. General → 确认 Display Name「循环班表」、版本号、Deployment Target。
3. 真机跑一遍，重点验证：
   - 首屏启动图能正常隐藏（`initNativeShell` 会调用 `SplashScreen.hide`）
   - 状态栏与底部安全区没有被内容遮挡
   - 设置页「导出备份」能拉起系统分享面板；「导入备份」能从“文件”里选 JSON
   - 杀进程重开，数据仍在（数据写在沙盒 `Documents/shift-ledger/data.json`）

## 五、提交到 App Store Connect

1. **创建 App**：App Store Connect → App → 新建 App
   - 平台 iOS，名称「循环班表」（名称需全局唯一，被占用时可用「循环班表 · 倒班工时」等）
   - 主要语言：简体中文，Bundle ID 选上面的，SKU 可填 `shift-ledger`
2. **归档上传**：Xcode 菜单 Product → Destination 选 `Any iOS Device` → Product → Archive
   → Distribute App → App Store Connect → Upload。
3. **填写元数据**（建议内容见下一节），上传截图：
   - 至少提供 6.9 英寸 iPhone 截图（1320×2868）3–10 张，其余尺寸 Apple 会自动缩放；
     如需单独上传 6.5 英寸，尺寸为 1242×2688
   - 可在模拟器（iPhone 16 Pro Max）用 ⌘S 截图
4. **App 隐私**：选择「不收集数据」；隐私政策 URL 填 `/privacy/` 那个线上地址。
5. **App 审核信息**：无需登录账号，备注里写明「离线本地工具，无账号体系，无服务器」。
6. 先用 TestFlight 自测一轮，再提交审核。

## 六、元数据草稿（可直接改用）

- **副标题**：为倒班人群设计的排班与工时账本
- **关键词**：倒班,轮班,排班,班表,工时,加班,四班三倒,考勤,值班,夜班
- **描述**：
  > 循环班表是为不按星期工作的人设计的个人排班工具。自定义班次、职责标签与循环模板，
  > 按四班两倒、做二休二、三班倒等常见规律自动生成整年班表；工时与加班分别统计，
  > 支持标准工时、综合计算工时、不定时工时与手动记录；自动识别法定节假日并推算每月
  > 基本工时。全部数据保存在设备本机，不需要注册登录，支持 JSON 备份导出与恢复。
- **年龄分级**：4+
- **类别**：主要「效率」，次要「商务」

## 七、审核常见风险与应对

| 风险 | 说明 | 应对 |
| --- | --- | --- |
| 2.1 完整性 | 空白首屏被判为无功能 | 首次进入是空日历，审核备注里说明「点击“循环排班模板”可一键生成示例班表」 |
| 4.2 最低功能 | 纯网页套壳会被拒 | 本工程用了原生分享、文件系统、启动图与状态栏，并且完全离线可用；备注中强调这是本地数据工具而非网页镜像 |
| 5.1.1 隐私 | 缺隐私政策链接 | 已提供 `/privacy/` 页面，App 内“设置 → 关于”也有入口 |
| 导出合规 | 每次上传都被问加密 | `Info.plist` 已设 `ITSAppUsesNonExemptEncryption = false` |
| 隐私清单 | 使用 UserDefaults / 文件时间戳 API | 已提供 `PrivacyInfo.xcprivacy` 并声明理由（CA92.1 / C617.1 / E174.1） |

## 八、后续发版流程

1. 改网页代码 → `npm run lint && npm test`
2. `npm run ios:sync`
3. Xcode 里把 `MARKETING_VERSION` 或 `CURRENT_PROJECT_VERSION` 加一
4. Archive → Upload → App Store Connect 提交新版本

网页版仍由 `main` 分支的 GitHub Pages 工作流自动发布，与 iOS 版共用同一份代码。
