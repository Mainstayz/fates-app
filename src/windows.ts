import type { WebviewOptions } from "@tauri-apps/api/webview";
import { getAllWindows, getCurrentWindow, type WindowOptions } from "@tauri-apps/api/window";
import { WebviewWindow, getAllWebviewWindows, getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { relaunch, exit } from "@tauri-apps/plugin-process";
import { emit, listen } from "@tauri-apps/api/event";

export async function createWindow(label: string,  options?: Omit<WebviewOptions, 'x' | 'y' | 'width' | 'height'> & WindowOptions) {
    console.log(`createWindow: ${label}`);
    const existWin = await getWin(label);
    if (existWin) {
        console.log(`window already exists: ${existWin.title}`);
        return existWin;
    }
    const window = new WebviewWindow(label, options);
    window.once("tauri://created", () => {
        console.log(`window created:`, window);
    });
    window.once("tauri://error", (error) => {
        console.error(`window creation failed:`, error);
    });
    return window;
}
export async function getWin(label: string) {
    return await WebviewWindow.getByLabel(label);
}
export async function getAllWin() {
    return await getAllWebviewWindows();
}
