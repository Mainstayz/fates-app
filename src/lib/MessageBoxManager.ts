import { listen } from "@tauri-apps/api/event";
import { platform } from "@tauri-apps/plugin-os";
import { PhysicalPosition, PhysicalSize, type Window } from "@tauri-apps/api/window";
import debounce from "debounce";
import type { MouseTrackerState } from "../features/mouse-tracker.svelte";
import { createWindow, getWindowByLabel } from "../tauri/windows";


const OFFSET_Y = 4;

export class MessageBoxManager {
    private devicePixelRatio: number;
    private messageBoxWidth: number;
    private messageBoxHeight: number;
    private unlisteners: Array<() => void>;
    private mouseTrackerState: MouseTrackerState;
    private atLeastOnceInside: boolean;
    private isInMessageBox: boolean;
    private debouncedShow: ReturnType<typeof debounce>;
    private debouncedHide: ReturnType<typeof debounce>;

    private static readonly CONFIG = {
        hideDelay: 200,
        showDelay: 200,
        macosYOffset: 74,
    } as const;

    constructor(mouseTrackerState: MouseTrackerState) {
        this.devicePixelRatio = window.devicePixelRatio;
        this.messageBoxWidth = 280;
        this.messageBoxHeight = 59;
        this.unlisteners = [];
        this.mouseTrackerState = mouseTrackerState;
        this.atLeastOnceInside = false;
        this.isInMessageBox = false;

        this.debouncedShow = debounce(
            (event: any) => this.showMessageBoxWin(event),
            MessageBoxManager.CONFIG.showDelay
        );
        this.debouncedHide = debounce(
            () => this.hideMessageBoxWin(),
            MessageBoxManager.CONFIG.hideDelay
        );
    }

    private calculatePhysicalPosition(x: number) {
        const platformName = platform().toLowerCase();
        const y = platformName === "macos"
            ? MessageBoxManager.CONFIG.macosYOffset
            : window.screen.availHeight - this.messageBoxHeight;

        return {
            x: Math.floor(x - this.messageBoxWidth / 2),
            y: Math.floor(y),
        };
    }

    private async showMessageBoxWin(event: any) {
        const win = await getWindowByLabel("message-box");
        if (!win || (await win.isVisible())) return;

        const mouse_position = event.payload.mouse_position as [number, number];
        const tray_rect = event.payload.tray_rect as [number, number, number, number];

        let { x, y } = this.calculatePhysicalPosition(mouse_position[0]);

        const platformName = platform().toLowerCase();

        if (platformName === "macos") {
            y += OFFSET_Y;
        } else {
            y -= OFFSET_Y;
        }

        const physicalWidth = this.messageBoxWidth * this.devicePixelRatio;
        const physicalHeight = this.messageBoxHeight * this.devicePixelRatio;

        console.log("window available size:", { width: window.screen.availWidth, height: window.screen.availHeight });
        console.log("message box position:", { x, y, physicalWidth, physicalHeight });

        await win.setPosition(new PhysicalPosition(x, y));
        await win.setSize(new PhysicalSize(physicalWidth, physicalHeight));
        await win.show();
        await win.setFocus();


        const rect1 = { x, y, width: physicalWidth, height: physicalHeight };
        const rect2 = {
            x: tray_rect[0],
            y: tray_rect[1],
            width: tray_rect[2],
            height: tray_rect[3]
        };

        this.mouseTrackerState.updateWindowRect([rect1, rect2]);
        this.mouseTrackerState.resume();
    }

    private async hideMessageBoxWin() {
        this.atLeastOnceInside = false;
        const win = await getWindowByLabel("message-box");
        if (win) {
            this.mouseTrackerState.pause();
            await win.hide();
        }
    }

    public async initialize() {
        const messageBoxWin = await this.setupMessageBoxWindow();
        await this.setupEventListeners(messageBoxWin);
        this.setupMouseTracker();
    }

    private async setupMessageBoxWindow() {
        return await createWindow("message-box", {
            title: "Message Box",
            url: "/message-box",
            width: this.messageBoxWidth,
            height: this.messageBoxHeight,
            decorations: false,
            resizable: false,
            alwaysOnTop: true,
            transparent: true,
            center: false,
            visible: false,
            skipTaskbar: true,
            shadow: false,
        });
    }

    private async setupEventListeners(messageBoxWin: Window) {
        const listeners = [
            ["tray_mouseenter", (event: any) => this.debouncedShow(event)],
            ["tray_mouseleave", () => {}],
        ] as const;

        for (const [event, handler] of listeners) {
            const unlisten = await listen(event, handler);
            this.unlisteners.push(unlisten);
        }

        const unlistenBlur = await messageBoxWin.listen("tauri://blur", () => this.debouncedHide());
        this.unlisteners.push(unlistenBlur);

        const unlistenHideMessageBox = await messageBoxWin.listen("hide-message-box", () => this.hideMessageBoxWin());
        this.unlisteners.push(unlistenHideMessageBox);

        const unlistenMessageBoxHeight = await messageBoxWin.listen("message-box-height", (event) => {
            console.log("on message-box-height event:", event.payload);
            this.messageBoxHeight = event.payload as number;
        });
        this.unlisteners.push(unlistenMessageBoxHeight);
    }

    private setupMouseTracker() {
        this.mouseTrackerState.setIsInsideCallback((isInside: boolean) => {
            this.isInMessageBox = isInside;

            if (isInside && !this.atLeastOnceInside) {
                this.atLeastOnceInside = true;
                return;
            }

            if (this.atLeastOnceInside && !isInside) {
                this.debouncedHide();
            }
        });
    }

    public destroy() {
        this.unlisteners.forEach(unlisten => unlisten?.());
    }
}
