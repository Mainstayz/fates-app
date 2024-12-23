import { Window } from "@tauri-apps/api/window";
import { createWindow } from "../tauri/windows";

export class TimeProgressBarManager {
    private static instance: TimeProgressBarManager;
    private window: Window | null = null;

    private constructor() {}

    public static getInstance(): TimeProgressBarManager {
        if (!TimeProgressBarManager.instance) {
            TimeProgressBarManager.instance = new TimeProgressBarManager();
        }
        return TimeProgressBarManager.instance;
    }

    public async initialize() {
        if (!this.window) {
            this.window = await this.createTimeProgressBarWindow();
        }
    }

    private async createTimeProgressBarWindow() {
        return await createWindow("time-progress-bar", {
            title: "Time Progress",
            url: "/time-progress-bar-floating",
            width: window.screen.width,
            height: 4,
            decorations: false,
            resizable: false,
            alwaysOnTop: true,
            transparent: true,
            center: false,
            visible: true,
            shadow: false,
            skipTaskbar: true,
            y: 0, // 放置在屏幕顶部
        });
    }

    public async show() {
        const win = await this.getWindow();
        if (win) {
            await win.show();
        }
    }

    public async hide() {
        const win = await this.getWindow();
        if (win) {
            await win.hide();
        }
    }

    public async setAlwaysOnTop(alwaysOnTop: boolean) {
        const win = await this.getWindow();
        if (win) {
            await win.setAlwaysOnTop(alwaysOnTop);
        }
    }

    private async getWindow(): Promise<Window | null> {
        if (!this.window) {
            this.window = await this.createTimeProgressBarWindow();
        }
        return this.window;
    }

    public async destroy() {
        // 什么也不做
    }
}
