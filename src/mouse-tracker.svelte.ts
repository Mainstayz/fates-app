import { TauriMouseTracker, TrackerState, type MouseEventData } from './mouse-tracker';

export class MouseTrackerState {
    tracker = $state<TauriMouseTracker | null>(null);
    isInside = $state(false);
    position = $state({ x: 0, y: 0 });
    state = $state<TrackerState>(TrackerState.DESTROYED);

    init() {
        if (this.tracker) {
            this.tracker.destroy();
        }

        const tracker = new TauriMouseTracker({
            debug: true,
            checkInterval: 100
        });

        tracker.on('mouseenter', (data: MouseEventData) => {
            this.isInside = true;
            this.position = data.position;
        });

        tracker.on('mouseleave', (data: MouseEventData) => {
            this.isInside = false;
            this.position = data.position;
        });

        this.tracker = tracker;
        this.state = TrackerState.ACTIVE;
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
}
