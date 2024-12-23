import type { WebviewOptions } from "@tauri-apps/api/webview";
import {
    LogicalPosition,
    LogicalSize,
    type WindowOptions,
} from "@tauri-apps/api/window";
import { WebviewWindow, getAllWebviewWindows } from "@tauri-apps/api/webviewWindow";

interface WindowCreationOptions extends Omit<WebviewOptions, "x" | "y" | "width" | "height">, WindowOptions {}

/**
 * Creates a new window or returns existing one if it already exists
 * @param label Unique identifier for the window
 * @param options Window configuration options
 * @returns Promise<WebviewWindow> The created or existing window instance
 * @throws Error if window creation fails
 */
export async function createWindow(label: string, options?: WindowCreationOptions): Promise<WebviewWindow> {
    try {
        console.log(`CreateWindow [${label}], check if window already exists ...`);
        const existingWindow = await getWindowByLabel(label);
        if (existingWindow) {
            console.log(`Window already exists: [${label}], set window rect ...`);
            await setWindowProperties(existingWindow, options);
            return existingWindow;
        }

        const window = new WebviewWindow(label, options);
        await new Promise<void>((resolve, reject) => {
            window.once("tauri://created", async () => {
                const [position, size] = await Promise.all([window.innerPosition(), window.innerSize()]);
                console.log(`On window created: ${label} x:${position.x} y:${position.y} w:${size.width} h:${size.height}, Step 2 set window rect ...`);
                await setWindowProperties(window, options);
                resolve();
            });
            window.once("tauri://error", (error) => {
                console.error("Window creation failed:", error);
                reject(new Error(`Failed to create window '${label}': ${error}`));
            });
        });
        return window;
    } catch (error) {
        console.error(`Error creating window '${label}':`, error);
        throw error;
    }
}

async function setWindowProperties(window: WebviewWindow, options?: WindowCreationOptions) {
    if (options?.x || options?.y || options?.width || options?.height) {
        const { x, y, width, height } = options;
        const safeX = x ?? 0;
        const safeY = y ?? 0;

        console.log("Set window [", window.label, "] position and size:", { x: safeX, y: safeY, width, height });
        await window.setPosition(new LogicalPosition(safeX, safeY));
        if (width && height) {
            await window.setSizeConstraints({ maxWidth: width, maxHeight: height });
            await window.setSize(new LogicalSize(width, height));
        }
    }
}

/**
 * Retrieves a window instance by its label
 * @param label The window's unique identifier
 * @returns Promise<WebviewWindow | null> The window instance or null if not found
 */
export async function getWindowByLabel(label: string): Promise<WebviewWindow | null> {
    try {
        return await WebviewWindow.getByLabel(label);
    } catch (error) {
        console.error(`Error getting window '${label}':`, error);
        return null;
    }
}

/**
 * Retrieves all active window instances
 * @returns Promise<WebviewWindow[]> Array of all window instances
 */
export async function getAllWindows(): Promise<WebviewWindow[]> {
    try {
        return await getAllWebviewWindows();
    } catch (error) {
        console.error("Error getting all windows:", error);
        return [];
    }
}
