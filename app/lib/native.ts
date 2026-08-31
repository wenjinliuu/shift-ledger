/**
 * 原生（iOS / Capacitor）与网页端的差异都收敛在这里。
 * 在浏览器中运行时全部回落到 localStorage 与浏览器下载。
 */
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const DATA_DIR = "shift-ledger";
const DATA_FILE = `${DATA_DIR}/data.json`;

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* 隐私模式或存储配额不足时忽略 */
  }
}

/**
 * 读取主数据。原生端优先读沙盒文件；老版本（PWA 时期）的
 * localStorage 数据会在首次启动时自动迁移过来。
 */
export async function loadStoredData(key: string): Promise<string | null> {
  if (!isNativeApp()) return readLocal(key);
  try {
    const file = await Filesystem.readFile({
      path: DATA_FILE,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    const value = typeof file.data === "string" ? file.data : null;
    if (value) return value;
  } catch {
    /* 文件不存在时继续尝试 localStorage */
  }
  const legacy = readLocal(key);
  if (legacy) await saveStoredData(key, legacy);
  return legacy;
}

/** 写入主数据。原生端写沙盒文件，同时保留一份 localStorage 兜底。 */
export async function saveStoredData(key: string, value: string): Promise<void> {
  if (!isNativeApp()) {
    writeLocal(key, value);
    return;
  }
  try {
    await Filesystem.mkdir({
      path: DATA_DIR,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    /* 目录已存在 */
  }
  try {
    await Filesystem.writeFile({
      path: DATA_FILE,
      directory: Directory.Data,
      data: value,
      encoding: Encoding.UTF8,
    });
  } catch {
    writeLocal(key, value);
  }
}

/**
 * 导出备份。原生端写入缓存目录后调用系统分享面板
 * （可存到“文件”、隔空投送或发送给自己）；网页端触发下载。
 */
export async function exportBackupFile(
  fileName: string,
  contents: string,
): Promise<"shared" | "cancelled" | "downloaded"> {
  if (isNativeApp()) {
    const result = await Filesystem.writeFile({
      path: fileName,
      directory: Directory.Cache,
      data: contents,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({
        title: "循环班表备份",
        files: [result.uri],
      });
    } catch (error) {
      // 用户在分享面板点取消不算失败
      if (String(error).toLowerCase().includes("cancel")) return "cancelled";
      throw error;
    }
    return "shared";
  }
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
