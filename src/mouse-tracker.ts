import { Window, cursorPosition } from "@tauri-apps/api/window";

export interface WindowRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface MouseTrackerOptions {
    checkInterval?: number;
    debug?: boolean;
    tolerance?: number;
    windowRect?: WindowRect[];
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
    protected options: Required<MouseTrackerOptions> & { windowRect: WindowRect[] };
    protected listeners: Map<MouseEventName, Set<EventCallback>>;
    protected intervalId?: number;
    protected state: TrackerState;

    constructor(options: MouseTrackerOptions = {}) {
        if (options.debug) {
            console.log("Initializing MouseTracker with options:", options);
        }

        const defaultRect: WindowRect = {
            x: 0,
            y: 0,
            width: 800,
            height: 600,
        };

        this.options = {
            checkInterval: 100,
            debug: false,
            tolerance: 5,
            windowRect: options.windowRect || [defaultRect],
            ...options,
        };

        this.isInside = false;
        this.lastKnownPosition = { x: 0, y: 0 };
        this.listeners = new Map();
        this.state = TrackerState.PAUSED;
    }

    // 获取当前跟踪器状态
    getState(): TrackerState {
        return this.state;
    }

    // 暂停跟踪
    pause(): boolean {
        if (this.options.debug) {
            console.log("Pausing mouse tracker");
        }
        this.state = TrackerState.PAUSED;
        this.stopIntervalCheck();
        return true;
    }

    // 恢复跟踪
    resume(): boolean {
        if (this.options.debug) {
            console.log("Resuming mouse tracker");
        }
        this.state = TrackerState.ACTIVE;

        this.startIntervalCheck();

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

        this.listeners.get(eventName)?.forEach((callback) => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${eventName} callback:`, error);
            }
        });
    }


    protected startIntervalCheck() {
        if (this.state !== TrackerState.ACTIVE) {
            if (this.options.debug) {
                console.log(`Cannot start interval check in ${this.state} state`);
            }
            return;
        }

        if (this.intervalId) {
            console.warn("Interval check already running, clearing previous interval");
            this.stopIntervalCheck();
        }

        this.intervalId = window.setInterval(() => {
            this.checkMousePosition();
        }, this.options.checkInterval);
    }

    protected stopIntervalCheck() {
        if (this.intervalId) {
            if (this.options.debug) {
                console.log("Stopping interval check");
            }
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }

    protected async checkMousePosition() {
        if (this.state !== TrackerState.ACTIVE) {
            if (this.options.debug) {
                console.log(`Cannot check mouse position in ${this.state} state`);
            }
            return;
        }
        // 如果 windowRect 为空或无效，则不进行检查
        if (
            !this.options.windowRect ||
            this.options.windowRect.length === 0 ||
            this.options.windowRect.some(rect =>
                rect.width === 0 || rect.height === 0
            )
        ) {
            if (this.options.debug) {
                console.log("Window rects are invalid, skipping check");
            }
            return;
        }

        try {
            const position = await cursorPosition();
            // 检查位置是否发生变化
            if (position.x === this.lastKnownPosition.x && position.y === this.lastKnownPosition.y) {
                return;
            }

            if (this.options.debug) {
                console.log(`Current cursor position: ${position.x}, ${position.y}`);
            }

            const eventData: MouseEventData = {
                position: {
                    x: position.x,
                    y: position.y,
                },
                timestamp: Date.now(),
            };

            // 触发 mousemove 事件
            this.emit("mousemove", eventData);

            this.lastKnownPosition = {
                x: position.x,
                y: position.y,
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

        if (this.options.debug) {
            console.log("Mouse left window:", eventData);
        }
        this.emit("mouseleave", eventData);
    }

    protected onMouseEnter() {
        const eventData: MouseEventData = {
            position: this.lastKnownPosition,
            timestamp: Date.now(),
        };

        if (this.options.debug) {
            console.log("Mouse entered window:", eventData);
        }
        this.emit("mouseenter", eventData);
    }

    destroy() {
        console.log("Destroying MouseTracker instance");
        this.state = TrackerState.DESTROYED;
        this.stopIntervalCheck();
        this.listeners.clear();
    }

    protected isPositionOutside(position: { x: number; y: number }): boolean {
        const { tolerance, windowRect } = this.options;

        // 检查是否在任意一个区域内
        const isInsideAnyRect = windowRect.some(rect => {
            const outside =
                position.x <= rect.x - tolerance ||
                position.x >= rect.x + rect.width + tolerance ||
                position.y <= rect.y - tolerance ||
                position.y >= rect.y + rect.height + tolerance;

            return !outside;
        });

        const result = !isInsideAnyRect;

        if (this.options.debug) {
            console.log(`Position check result: ${result ? "outside" : "inside"} position: ${position.x}, ${position.y}, [${windowRect.map(rect => `${rect.x}, ${rect.y}, ${rect.width}, ${rect.height}`).join(" | ")}]`);
        }

        return result;
    }

    updateWindowRect(rects: WindowRect[]) {
        this.options.windowRect = rects;
        if (this.options.debug) {
            console.log("Window rects updated:", this.options.windowRect);
        }
    }
}

class TauriMouseTracker extends MouseTracker {
    private tauriWindow: Window;
    private unlisteners: Array<() => void>;

    constructor(options: MouseTrackerOptions = {}) {
        super(options);
        if (this.options.debug) {
            console.log("Initializing TauriMouseTracker");
        }
        this.tauriWindow = Window.getCurrent();
        this.unlisteners = [];
        this.setupTauriEvents();
        this.updateTauriWindowBounds();
    }

    private async updateTauriWindowBounds() {
        try {
            const outerPosition = await this.tauriWindow.outerPosition();
            const size = await this.tauriWindow.innerSize();

            this.updateWindowRect([{
                x: outerPosition.x,
                y: outerPosition.y,
                width: size.width,
                height: size.height,
            }]);
        } catch (error) {
            console.error("Failed to update Tauri window bounds:", error);
        }
    }

    protected async setupTauriEvents() {
        if (this.options.debug) {
            console.log("Setting up Tauri events");
        }

        try {
            const unlistener = await this.tauriWindow.listen("blur", () => {
                if (this.options.debug) {
                    console.log("Tauri window blur event detected");
                }
                this.checkMousePosition();
            });
            this.unlisteners.push(unlistener);

            const unlistener2 = await this.tauriWindow.listen("moved", async () => {
                if (this.options.debug) {
                    console.log("Tauri window moved event detected");
                }
                await this.updateTauriWindowBounds();
                this.checkMousePosition();
            });
            this.unlisteners.push(unlistener2);

            const unlistener3 = await this.tauriWindow.listen("resized", async () => {
                if (this.options.debug) {
                    console.log("Tauri window resized event detected");
                }
                await this.updateTauriWindowBounds();
                this.checkMousePosition();
            });
            this.unlisteners.push(unlistener3);

            const unlistener4 = await this.tauriWindow.listen("scaleChanged", async () => {
                if (this.options.debug) {
                    console.log("Tauri window scale changed event detected");
                }
                await this.updateTauriWindowBounds();
                this.checkMousePosition();
            });
            this.unlisteners.push(unlistener4);

            const unlistener5 = await this.tauriWindow.listen("maximize", async () => {
                if (this.options.debug) {
                    console.log("Tauri window maximized event detected");
                }
                await this.updateTauriWindowBounds();
            });
            this.unlisteners.push(unlistener5);

            const unlistener6 = await this.tauriWindow.listen("unmaximize", async () => {
                if (this.options.debug) {
                    console.log("Tauri window unmaximized event detected");
                }
                await this.updateTauriWindowBounds();
            });
            this.unlisteners.push(unlistener6);

            if (this.options.debug) {
                console.log("Tauri events setup completed successfully");
            }
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

        if (this.options.debug) {
            console.log("Tauri: Mouse left window:", eventData);
        }
        this.emit("mouseleave", eventData);
    }

    protected async onMouseEnter() {
        const eventData: MouseEventData = {
            position: this.lastKnownPosition,
            timestamp: Date.now(),
        };

        if (this.options.debug) {
            console.log("Tauri: Mouse entered window:", eventData);
        }
        this.emit("mouseenter", eventData);
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
