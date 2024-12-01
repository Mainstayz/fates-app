import { Window } from '@tauri-apps/api/window';

interface MouseTrackerOptions {
    checkInterval?: number;
    debug?: boolean;
    enableInterval?: boolean;
    tolerance?: number;
}

type MouseEventName = 'mouseleave' | 'mouseenter';
type EventCallback = (data: MouseEventData) => void;

interface MouseEventData {
    position: { x: number; y: number };
    timestamp: number;
}

class MouseTracker {
    protected isInside: boolean;
    protected lastKnownPosition: { x: number; y: number };
    protected options: Required<MouseTrackerOptions>;
    protected listeners: Map<MouseEventName, Set<EventCallback>>;
    protected intervalId?: number;

    constructor(options: MouseTrackerOptions = {}) {
        this.options = {
            checkInterval: 100,
            debug: false,
            enableInterval: true,
            tolerance: 5,
            ...options
        };

        this.isInside = false;
        this.lastKnownPosition = { x: 0, y: 0 };
        this.listeners = new Map();

        this.setupEventListeners();

        if (this.options.enableInterval) {
            this.startIntervalCheck();
        }
    }

    on(eventName: MouseEventName, callback: EventCallback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName)?.add(callback);
    }

    off(eventName: MouseEventName, callback: EventCallback) {
        this.listeners.get(eventName)?.delete(callback);
    }

    protected emit(eventName: MouseEventName, data: MouseEventData) {
        this.listeners.get(eventName)?.forEach(callback => callback(data));
    }

    protected setupEventListeners() {
        const events: Array<keyof DocumentEventMap> = ['mousemove', 'mouseleave', 'mouseout', 'mouseover'];
        events.forEach(event => {
            document.addEventListener(event, (e: Event) => this.handleMouseEvent(e as MouseEvent));
        });

        window.addEventListener('blur', () => {
            this.checkMousePosition();
        });
    }

    protected startIntervalCheck() {
        this.intervalId = window.setInterval(() => {
            this.checkMousePosition();
        }, this.options.checkInterval);
    }

    protected stopIntervalCheck() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    protected handleMouseEvent(event: MouseEvent) {
        this.lastKnownPosition = {
            x: event.clientX,
            y: event.clientY
        };

        const rect = document.documentElement.getBoundingClientRect();
        const isOutside = this.isPositionOutside(this.lastKnownPosition, rect);

        if (this.isInside && isOutside) {
            this.isInside = false;
            this.onMouseLeave();
        } else if (!this.isInside && !isOutside) {
            this.isInside = true;
            this.onMouseEnter();
        }
    }

    protected isPositionOutside(position: { x: number; y: number }, rect: DOMRect): boolean {
        const { tolerance } = this.options;
        return (
            position.x <= rect.left - tolerance ||
            position.x >= rect.right + tolerance ||
            position.y <= rect.top - tolerance ||
            position.y >= rect.bottom + tolerance
        );
    }

    protected checkMousePosition() {
        const rect = document.documentElement.getBoundingClientRect();
        const isOutside = this.isPositionOutside(this.lastKnownPosition, rect);

        if (isOutside && this.isInside) {
            this.isInside = false;
            this.onMouseLeave();
        }
    }

    protected onMouseLeave() {
        const eventData: MouseEventData = {
            position: this.lastKnownPosition,
            timestamp: Date.now()
        };

        if (this.options.debug) {
            console.log('Mouse left window:', eventData);
        }

        this.emit('mouseleave', eventData);
    }

    protected onMouseEnter() {
        const eventData: MouseEventData = {
            position: this.lastKnownPosition,
            timestamp: Date.now()
        };

        if (this.options.debug) {
            console.log('Mouse entered window:', eventData);
        }

        this.emit('mouseenter', eventData);
    }

    destroy() {
        this.stopIntervalCheck();
        this.listeners.clear();
    }
}

class TauriMouseTracker extends MouseTracker {
    private tauriWindow: Window;

    constructor(options: MouseTrackerOptions = {}) {
        super(options);
        this.tauriWindow = Window.getCurrent();
        this.setupTauriEvents();
    }

    protected async setupTauriEvents() {
        try {
            await this.tauriWindow.listen('blur', () => {
                this.checkMousePosition();
            });

            await this.tauriWindow.listen('moved', () => {
                this.checkMousePosition();
            });

            if (this.options.debug) {
                console.log('Tauri events setup completed');
            }
        } catch (error) {
            console.error('Failed to setup Tauri events:', error);
        }
    }

    protected async onMouseLeave() {
        const eventData: MouseEventData = {
            position: this.lastKnownPosition,
            timestamp: Date.now()
        };

        if (this.options.debug) {
            console.log('Mouse left window:', eventData);
        }

        this.emit('mouseleave', eventData);

        try {
            await this.tauriWindow.emit('mouse-left-window', eventData);
        } catch (error) {
            console.error('Failed to emit Tauri event:', error);
        }
    }

    protected async onMouseEnter() {
        const eventData: MouseEventData = {
            position: this.lastKnownPosition,
            timestamp: Date.now()
        };

        if (this.options.debug) {
            console.log('Mouse entered window:', eventData);
        }

        this.emit('mouseenter', eventData);

        try {
            await this.tauriWindow.emit('mouse-entered-window', eventData);
        } catch (error) {
            console.error('Failed to emit Tauri event:', error);
        }
    }
}

export { MouseTracker, TauriMouseTracker, type MouseTrackerOptions };
