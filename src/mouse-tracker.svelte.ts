import { TauriMouseTracker, TrackerState, type MouseEventData, type WindowRect } from './mouse-tracker';

export class MouseTrackerState {
    tracker = $state<TauriMouseTracker | null>(null);
    isInside = $state(false);
    position = $state({ x: 0, y: 0 });
    state = $state<TrackerState>(TrackerState.DESTROYED);

    // 添加一个回调属性
    private onIsInsideChange?: (isInside: boolean) => void;

    constructor() {
        $effect(() => {
            console.log("isInside", this.isInside);
            if (this.onIsInsideChange) {
                this.onIsInsideChange(this.isInside);
            }
        });
    }

    init() {
        if (this.tracker) {
            this.tracker.destroy();
        }

        // 默认不启用 interval 检查
        const tracker = new TauriMouseTracker({
            debug: false,
            checkInterval: 100,
            tolerance: 6,
            windowRect: [{
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            }],
        });

        tracker.on('mouseenter', (data: MouseEventData) => {
            this.isInside = true;
            this.position = data.position;
        });

        tracker.on('mouseleave', (data: MouseEventData) => {
            this.isInside = false;
            this.position = data.position;
        });

        // mousemove
        tracker.on('mousemove', (data: MouseEventData) => {
            this.position = data.position;
        });

        this.tracker = tracker;
        this.state = TrackerState.PAUSED;
    }

    updateWindowRect(rect: WindowRect[]) {
        if (this.tracker) {
            this.tracker.updateWindowRect(rect);
        }
    }

    pause() {
        if (this.tracker) {
            this.tracker.pause();
            this.state = TrackerState.PAUSED;
        }
    }

    resume() {
        if (this.tracker) {
            this.tracker.resume();
            this.state = TrackerState.ACTIVE;
        }
    }

    destroy() {
        if (this.tracker) {
            this.tracker.destroy();
            this.tracker = null;
            this.state = TrackerState.DESTROYED;
            this.isInside = false;
            this.position = { x: 0, y: 0 };
        }
    }

    // 添加设置回调的方法
    setIsInsideCallback(callback: (isInside: boolean) => void) {
        this.onIsInsideChange = callback;
    }
}
