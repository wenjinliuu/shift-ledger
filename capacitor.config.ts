import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.wenjinliu.shiftledger",
  appName: "循环班表",
  webDir: "out",
  ios: {
    contentInset: "never",
    backgroundColor: "#f1f1f4",
  },
  server: {
    // 本机静态资源，不访问任何远程服务器。
    androidScheme: "https",
    iosScheme: "capacitor",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#f1f1f4ff",
      showSpinner: false,
    },
    StatusBar: {
      style: "DEFAULT",
      overlaysWebView: true,
    },
  },
};

export default config;
