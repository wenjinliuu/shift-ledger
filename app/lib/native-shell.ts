/** iOS 原生外壳初始化：状态栏样式、启动图隐藏、禁止整页回弹。 */
import { isNativeApp } from "./native";

export async function initNativeShell(): Promise<void> {
  if (!isNativeApp()) return;
  document.documentElement.classList.add("native-app");
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* 状态栏插件不可用时忽略 */
  }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 220 });
  } catch {
    /* 启动图插件不可用时忽略 */
  }
}
