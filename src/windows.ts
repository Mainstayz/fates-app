import type { WebviewOptions } from "@tauri-apps/api/webview";
import { LogicalSize, type WindowOptions } from "@tauri-apps/api/window";
import { WebviewWindow, getAllWebviewWindows } from "@tauri-apps/api/webviewWindow";

export async function createWindow(
    label: string,
    options?: Omit<WebviewOptions, "x" | "y" | "width" | "height"> & WindowOptions
) {

    const existWin = await getWin(label);
    if (existWin) {
        return existWin;
    }

    const window = new WebviewWindow(label, options);

    window.once("tauri://created", async () => {
        console.log(
            "window created",
            label,
            "innerPosition",
            await window.innerPosition(),
            "innerSize",
            await window.innerSize()
        );
    });

    window.once("tauri://error", (error) => {
        console.error("window creation failed:", error);
    });

    // Fix window size
    const width = options?.width ?? 0;
    const height = options?.height ?? 0;
    if (width > 0 && height > 0) {
        window.setSize(new LogicalSize(width, height)).then(async () => {
            const innerSize = await window.innerSize();
            console.log(
                `createWindow: ${label} set size to ${width}x${height}, inner size: ${innerSize.width}x${innerSize.height}`
            );
        });
    }
    return window;
}
export async function getWin(label: string) {
    return await WebviewWindow.getByLabel(label);
}
export async function getAllWin() {
    return await getAllWebviewWindows();
}
