import { listen } from "@tauri-apps/api/event";
import { platform } from "@tauri-apps/plugin-os";
import { PhysicalPosition, PhysicalSize, type Window } from "@tauri-apps/api/window";
import debounce from "debounce";
import type { MouseTrackerState } from "../features/mouse-tracker.svelte";
import { createWindow, getWindowByLabel } from "../tauri/windows";

// Constants
const OFFSET_Y = 4;

// Event Listener Manager
class EventListenerManager {
    private listeners: Array<() => void> = [];

    add(listener: () => void) {
        this.listeners.push(listener);
    }

    removeAll() {
        this.listeners.forEach(unlisten => unlisten?.());
        this.listeners = [];
    }
}

// Window Position Calculator
class WindowPositionCalculator {
    private devicePixelRatio: number;
    private messageBoxWidth: number;
    private messageBoxHeight: number;

    constructor(devicePixelRatio: number, width: number, height: number) {
        this.devicePixelRatio = devicePixelRatio;
        this.messageBoxWidth = width;
        this.messageBoxHeight = height;
    }

    get width() {
        return this.messageBoxWidth;
    }

    get height() {
        return this.messageBoxHeight;
    }

    calculatePhysicalPosition(x: number) {
        const platformName = platform().toLowerCase();
        const y = platformName === "macos"
            ? MessageBoxManager.CONFIG.macosYOffset
            : window.screen.availHeight - this.messageBoxHeight;

        return {
            x: Math.floor(x - this.messageBoxWidth / 2),
            y: Math.floor(y),
        };
    }
}

// MessageBox State
enum MessageBoxState {
    HIDDEN,
    VISIBLE,
    TRANSITIONING
}

export class MessageBoxManager {
    private positionCalculator: WindowPositionCalculator;
    private eventListeners: EventListenerManager;
    private mouseTrackerState: MouseTrackerState;
    private state: MessageBoxState = MessageBoxState.HIDDEN;
    private atLeastOnceInside: boolean = false;
    private isInMessageBox: boolean = false;
    private debouncedShow: ReturnType<typeof debounce>;
    private debouncedHide: ReturnType<typeof debounce>;

    public static readonly CONFIG = {
        hideDelay: 200,
        showDelay: 200,
        macosYOffset: 74,
        width: 280,
        initialHeight: 59,
    } as const;

    constructor(mouseTrackerState: MouseTrackerState) {
        this.positionCalculator = new WindowPositionCalculator(
            window.devicePixelRatio,
            MessageBoxManager.CONFIG.width,
            MessageBoxManager.CONFIG.initialHeight
        );
        this.eventListeners = new EventListenerManager();
        this.mouseTrackerState = mouseTrackerState;

        this.debouncedShow = debounce(
            (event: any) => this.showMessageBoxWin(event),
            MessageBoxManager.CONFIG.showDelay
        );
        this.debouncedHide = debounce(
            () => this.hideMessageBoxWin(),
            MessageBoxManager.CONFIG.hideDelay
        );
    }

    private async showMessageBoxWin(event: any) {
        if (this.state === MessageBoxState.VISIBLE) {
            console.log("消息框已显示，跳过显示操作");
            return;
        }

        const win = await getWindowByLabel("message-box");
        if (!win) {
            console.log("未找到消息框窗口");
            return;
        }

        console.log("正在显示消息框...");
        this.state = MessageBoxState.TRANSITIONING;

        const mouse_position = event.payload.mouse_position as [number, number];
        const tray_rect = event.payload.tray_rect as [number, number, number, number];

        let { x, y } = this.positionCalculator.calculatePhysicalPosition(mouse_position[0]);

        const platformName = platform().toLowerCase();
        y += platformName === "macos" ? OFFSET_Y : -OFFSET_Y;

        const physicalWidth = this.positionCalculator.width * window.devicePixelRatio;
        const physicalHeight = this.positionCalculator.height * window.devicePixelRatio;

        console.log(`窗口可用尺寸：宽度=${window.screen.availWidth}, 高度=${window.screen.availHeight}`);
        console.log(`消息框位置：x=${x}, y=${y}, 宽度=${physicalWidth}, 高度=${physicalHeight} Y 轴偏移量=${OFFSET_Y}  Y + 高度 + 偏移量=${y + physicalHeight + OFFSET_Y}`);

        await win.setPosition(new PhysicalPosition(x, y));
        await win.setSize(new PhysicalSize(physicalWidth, physicalHeight));
        await win.show();
        await win.setFocus();

        this.mouseTrackerState.updateWindowRect([
            { x, y, width: physicalWidth, height: physicalHeight },
            {
                x: tray_rect[0],
                y: tray_rect[1],
                width: tray_rect[2],
                height: tray_rect[3]
            }
        ]);
        this.mouseTrackerState.resume();

        this.state = MessageBoxState.VISIBLE;
        console.log("消息框显示完成");
    }

    private async hideMessageBoxWin() {
        if (this.state === MessageBoxState.HIDDEN) {
            console.log("消息框已隐藏，跳过隐藏操作");
            return;
        }

        console.log("正在隐藏消息框...");
        this.state = MessageBoxState.TRANSITIONING;
        this.atLeastOnceInside = false;

        const win = await getWindowByLabel("message-box");
        if (win) {
            this.mouseTrackerState.pause();
            await win.hide();
        }

        this.state = MessageBoxState.HIDDEN;
        console.log("消息框隐藏完成");
    }

    public async initialize() {
        console.log("初始化消息框管理器...");
        const messageBoxWin = await this.setupMessageBoxWindow();
        await this.setupEventListeners(messageBoxWin);
        this.setupMouseTracker();
        console.log("消息框管理器初始化完成");
    }

    private async setupMessageBoxWindow() {
        console.log("创建消息框窗口...");
        return await createWindow("message-box", {
            title: "Message Box",
            url: "/message-box",
            width: MessageBoxManager.CONFIG.width,
            height: this.positionCalculator.height,
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
        console.log("设置事件监听器...");
        const listeners = [
            ["tray_mouseenter", (event: any) => this.debouncedShow(event)],
            ["tray_mouseleave", () => {}],
        ] as const;

        for (const [event, handler] of listeners) {
            const unlisten = await listen(event, handler);
            this.eventListeners.add(unlisten);
        }

        this.eventListeners.add(
            await messageBoxWin.listen("tauri://blur", () => this.debouncedHide())
        );

        this.eventListeners.add(
            await messageBoxWin.listen("hide-message-box", () => this.hideMessageBoxWin())
        );

        this.eventListeners.add(
            await messageBoxWin.listen("message-box-height", (event) => {
                console.log("收到消息框高度事件：", event.payload);
                this.positionCalculator = new WindowPositionCalculator(
                    window.devicePixelRatio,
                    MessageBoxManager.CONFIG.width,
                    event.payload as number
                );
            })
        );
    }

    private setupMouseTracker() {
        console.log("设置鼠标跟踪器...");
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
        console.log("销毁消息框管理器...");
        this.eventListeners.removeAll();
    }
}
