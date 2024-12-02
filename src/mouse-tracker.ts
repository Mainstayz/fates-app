import { Window ,cursorPosition} from "@tauri-apps/api/window";

interface WindowBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface MouseTrackerOptions {
    checkInterval?: number;
    debug?: boolean;
    enableInterval?: boolean;
    tolerance?: number;
    windowBounds?: WindowBounds;
}

export type MouseEventName = "mouseleave" | "mouseenter" | "mousemove";
export type EventCallback = (data: MouseEventData) => void;

export interface MouseEventData {
    position: { x: number; y: number };
    timestamp: number;
}

export enum TrackerState {
    ACTIVE = "active",
    PAUSED = "paused",
    DESTROYED = "destroyed",
}

class MouseTracker {
    protected isInside: boolean;
    protected lastKnownPosition: { x: number; y: number };
    protected options: Required<MouseTrackerOptions> & { windowBounds: WindowBounds };
    protected listeners: Map<MouseEventName, Set<EventCallback>>;
    protected intervalId?: number;
    protected state: TrackerState;

    constructor(options: MouseTrackerOptions = {}) {
        console.log("Initializing MouseTracker with options:", options);

        const defaultBounds: WindowBounds = {
            x: 0,
            y: 0,
            width: 800,
            height: 600
        };

        this.options = {
            checkInterval: 100,
            debug: false,
            enableInterval: true,
            tolerance: 5,
            windowBounds: defaultBounds,
            ...options,
        };

        this.isInside = false;
        this.lastKnownPosition = { x: 0, y: 0 };
        this.listeners = new Map();
        this.state = TrackerState.ACTIVE;

        console.log("MouseTracker initialized with final options:", this.options);

        this.setupEventListeners();

        if (this.options.enableInterval) {
            console.log("Starting interval check");
            this.startIntervalCheck();
        }
    }

    // 获取当前跟踪器状态
    getState(): TrackerState {
        return this.state;
    }

    // 暂停跟踪
    pause(): boolean {
        if (this.state !== TrackerState.ACTIVE) {
            console.log(`Cannot pause tracker in ${this.state} state`);
            return false;
        }

        console.log("Pausing mouse tracker");
        this.state = TrackerState.PAUSED;
        this.stopIntervalCheck();
        return true;
    }

    // 恢复跟踪
    resume(): boolean {
        if (this.state !== TrackerState.PAUSED) {
            console.log(`Cannot resume tracker in ${this.state} state`);
            return false;
        }

        console.log("Resuming mouse tracker");
        this.state = TrackerState.ACTIVE;

        if (this.options.enableInterval) {
            this.startIntervalCheck();
        }

        return true;
    }

    on(eventName: MouseEventName, callback: EventCallback) {
        if (this.state === TrackerState.DESTROYED) {
            console.warn("Cannot add listener to destroyed tracker");
            return;
        }

        if (this.options.debug) {
            console.log(`Adding listener for event: ${eventName}`);
        }

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName)?.add(callback);

        if (this.options.debug) {
            console.log(`Current listener count for ${eventName}:`, this.listeners.get(eventName)?.size);
        }
    }

    off(eventName: MouseEventName, callback: EventCallback) {
        if (this.state === TrackerState.DESTROYED) {
            console.warn("Cannot remove listener from destroyed tracker");
            return;
        }

        if (this.options.debug) {
            console.log(`Removing listener for event: ${eventName}`);
        }

        const success = this.listeners.get(eventName)?.delete(callback);

        if (this.options.debug) {
            console.log(`Listener removal ${success ? "successful" : "failed"}`);
        }
    }

    protected emit(eventName: MouseEventName, data: MouseEventData) {
        if (this.state !== TrackerState.ACTIVE) {
            return;
        }

        if (this.options.debug) {
            console.log(`Emitting ${eventName} event:`, data);
            console.log(`Number of listeners for ${eventName}:`, this.listeners.get(eventName)?.size);
        }

        this.listeners.get(eventName)?.forEach((callback) => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${eventName} callback:`, error);
            }
        });
    }

    protected setupEventListeners() {
        console.log("Setting up cursor position monitoring");

        if (this.options.enableInterval) {
            this.startIntervalCheck();
        }
    }

    protected startIntervalCheck() {
        if (this.state !== TrackerState.ACTIVE) {
            return;
        }

        if (this.intervalId) {
            console.warn("Interval check already running, clearing previous interval");
            this.stopIntervalCheck();
        }

        this.intervalId = window.setInterval(() => {
            if (this.state === TrackerState.ACTIVE && this.options.debug) {
                console.log("Running interval check");
            }
            this.checkMousePosition();
        }, this.options.checkInterval);
    }

    protected stopIntervalCheck() {
        if (this.intervalId) {
            console.log("Stopping interval check");
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }

    protected async checkMousePosition() {
        if (this.state !== TrackerState.ACTIVE) {
            return;
        }

        try {
            const position = await cursorPosition();

            // 检查位置是否发生变化
            if (position.x === this.lastKnownPosition.x &&
                position.y === this.lastKnownPosition.y) {
                if (this.options.debug) {
                    console.log("Cursor position unchanged, skipping update");
                }
                return;
            }

            if (this.options.debug) {
                console.log("Current cursor position:", position);
            }

            const eventData: MouseEventData = {
                position: {
                    x: position.x,
                    y: position.y
                },
                timestamp: Date.now()
            };
            this.emit("mousemove", eventData);

            this.lastKnownPosition = {
                x: position.x,
                y: position.y
            };

            const isOutside = this.isPositionOutside(this.lastKnownPosition);

            if (isOutside && this.isInside) {
                console.log("Mouse position check detected leave condition");
                this.isInside = false;
                this.onMouseLeave();
            } else if (!isOutside && !this.isInside) {
                console.log("Mouse position check detected enter condition");
                this.isInside = true;
                this.onMouseEnter();
            }
        } catch (error) {
            console.error("Failed to get cursor position:", error);
        }
    }

    protected onMouseLeave() {
        const eventData: MouseEventData = {
            position: this.lastKnownPosition,
            timestamp: Date.now(),
        };

        console.log("Mouse left window:", eventData);
        this.emit("mouseleave", eventData);
    }

    protected onMouseEnter() {
        const eventData: MouseEventData = {
            position: this.lastKnownPosition,
            timestamp: Date.now(),
        };

        console.log("Mouse entered window:", eventData);
        this.emit("mouseenter", eventData);
    }

    destroy() {
        console.log("Destroying MouseTracker instance");
        this.state = TrackerState.DESTROYED;
        this.stopIntervalCheck();
        this.listeners.clear();
    }

    protected isPositionOutside(position: { x: number; y: number }): boolean {
        const { tolerance, windowBounds } = this.options;
        const result =
            position.x <= windowBounds.x - tolerance ||
            position.x >= windowBounds.x + windowBounds.width + tolerance ||
            position.y <= windowBounds.y - tolerance ||
            position.y >= windowBounds.y + windowBounds.height + tolerance;

        if (this.options.debug) {
            console.log("Position check:", {
                position,
                windowBounds,
                tolerance,
                isOutside: result,
            });
        }

        return result;
    }

    updateWindowBounds(bounds: WindowBounds) {
        this.options.windowBounds = bounds;
        if (this.options.debug) {
            console.log("Window bounds updated:", bounds);
        }
    }
}

class TauriMouseTracker extends MouseTracker {
    private tauriWindow: Window;
    private unlisteners: Array<() => void>;

    constructor(options: MouseTrackerOptions = {}) {
        super(options);
        console.log("Initializing TauriMouseTracker");
        this.tauriWindow = Window.getCurrent();
        this.unlisteners = [];
        this.setupTauriEvents();
        this.updateTauriWindowBounds();
    }

    private async updateTauriWindowBounds() {
        try {
            const outerPosition = await this.tauriWindow.outerPosition();
            const size = await this.tauriWindow.innerSize();

            this.updateWindowBounds({
                x: outerPosition.x,
                y: outerPosition.y,
                width: size.width,
                height: size.height
            });
        } catch (error) {
            console.error("Failed to update Tauri window bounds:", error);
        }
    }

    protected async setupTauriEvents() {
        console.log("Setting up Tauri events");

        try {
            const unlistener = await this.tauriWindow.listen("blur", () => {
                console.log("Tauri window blur event detected");
                this.checkMousePosition();
            });
            this.unlisteners.push(unlistener);

            const unlistener2 = await this.tauriWindow.listen("moved", async () => {
                console.log("Tauri window moved event detected");
                await this.updateTauriWindowBounds();
                this.checkMousePosition();
            });
            this.unlisteners.push(unlistener2);

            const unlistener3 = await this.tauriWindow.listen("resized", async () => {
                console.log("Tauri window resized event detected");
                await this.updateTauriWindowBounds();
                this.checkMousePosition();
            });
            this.unlisteners.push(unlistener3);

            const unlistener4 = await this.tauriWindow.listen("scaleChanged", async () => {
                console.log("Tauri window scale changed event detected");
                await this.updateTauriWindowBounds();
                this.checkMousePosition();
            });
            this.unlisteners.push(unlistener4);

            const unlistener5 = await this.tauriWindow.listen("maximize", async () => {
                console.log("Tauri window maximized event detected");
                await this.updateTauriWindowBounds();
            });
            this.unlisteners.push(unlistener5);

            const unlistener6 = await this.tauriWindow.listen("unmaximize", async () => {
                console.log("Tauri window unmaximized event detected");
                await this.updateTauriWindowBounds();
            });
            this.unlisteners.push(unlistener6);

            console.log("Tauri events setup completed successfully");
        } catch (error) {
            console.error("Failed to setup Tauri events:", error);
            throw error;
        }
    }

    pause(): boolean {
        const paused = super.pause();
        if (paused) {
            // 暂停 Tauri 相关的监听
            this.unlisteners.forEach(async (unlistener) => {
                try {
                    unlistener();
                } catch (error) {
                    console.error(`Failed to unlisten Tauri event:`, error);
                }
            });
        }
        return paused;
    }

    resume(): boolean {
        const resumed = super.resume();
        if (resumed) {
            // 重新设置 Tauri 事件
            this.setupTauriEvents();
        }
        return resumed;
    }

    protected async onMouseLeave() {
        const eventData: MouseEventData = {
            position: this.lastKnownPosition,
            timestamp: Date.now(),
        };

        console.log("Tauri: Mouse left window:", eventData);
        this.emit("mouseleave", eventData);

        try {
            await this.tauriWindow.emit("mouse-left-window", eventData);
            console.log("Successfully emitted Tauri mouse-left-window event");
        } catch (error) {
            console.error("Failed to emit Tauri mouse-left-window event:", error);
            throw error; // 重新抛出错误以便上层处理
        }
    }

    protected async onMouseEnter() {
        const eventData: MouseEventData = {
            position: this.lastKnownPosition,
            timestamp: Date.now(),
        };

        console.log("Tauri: Mouse entered window:", eventData);
        this.emit("mouseenter", eventData);

        try {
            await this.tauriWindow.emit("mouse-entered-window", eventData);
            console.log("Successfully emitted Tauri mouse-entered-window event");
        } catch (error) {
            console.error("Failed to emit Tauri mouse-entered-window event:", error);
            throw error; // 重新抛出错误以便上层处理
        }
    }

    destroy() {
        super.destroy();
        // 清理 Tauri 特定的资源
        this.unlisteners.forEach(async (unlistener) => {
            try {
                unlistener();
            } catch (error) {
                console.error(`Failed to unlisten Tauri event:`, error);
            }
        });
        this.unlisteners = [];
    }
}

export { MouseTracker, TauriMouseTracker, type MouseTrackerOptions };
