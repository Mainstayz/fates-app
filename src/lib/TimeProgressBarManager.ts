import { Window } from "@tauri-apps/api/window";
import { createTimeProgressBarWindow, getWindowByLabel } from "../windows";

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
            this.window = await createTimeProgressBarWindow();
        }
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
            this.window = await getWindowByLabel("time-progress-bar");
        }
        return this.window;
    }

    public async destroy() {
        const win = await this.getWindow();
        if (win) {
            await win.close();
            this.window = null;
        }
    }
}
