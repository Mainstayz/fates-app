<!-- TimeProgressBar.svelte -->
<script lang="ts">

    interface TimeSegment {
        start: number;
        end: number;
        color: string;
    }

    // Props using $props
    const {
        height = "100%",
        cursorWidth = "2px",
        cursorColor = "#000",
        maskColor = "rgba(0, 0, 0, 0.3)",
        backgroundColor = "#f0f0f0",
        timeSegments = [] as TimeSegment[]
    } = $props<{
        height?: string;
        cursorWidth?: string;
        cursorColor?: string;
        maskColor?: string;
        backgroundColor?: string;
        timeSegments?: TimeSegment[];
    }>();

    // State
    let progressPercentage = $state(0);
    let validSegments = $state<Array<TimeSegment & { percentage: { start: number; end: number } }>>([]);
    let segmentStyles = $state<Array<{ left: string; width: string; color: string }>>([]);

    const SECONDS_PER_DAY = 24 * 60 * 60;

    function getSecondsOfDay(timestamp: number): number {
        const date = new Date(timestamp);
        return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
    }

    function secondsToPercentage(seconds: number): number {
        return (seconds / SECONDS_PER_DAY) * 100;
    }

    // Process timeSegments when they change
    $effect(() => {
        const converted = timeSegments
            .map((segment: TimeSegment) => ({
                ...segment,
                seconds: {
                    start: getSecondsOfDay(segment.start),
                    end: getSecondsOfDay(segment.end),
                },
            }))
            .sort((a: any, b: any) => a.seconds.start - b.seconds.start);

        const newValidSegments = [];
        let lastEndSeconds = 0;

        for (const segment of converted) {
            if (
                segment.seconds.start >= lastEndSeconds &&
                segment.seconds.start < segment.seconds.end &&
                segment.seconds.start >= 0 &&
                segment.seconds.end <= SECONDS_PER_DAY &&
                segment.seconds.end > segment.seconds.start
            ) {
                newValidSegments.push({
                    ...segment,
                    percentage: {
                        start: secondsToPercentage(segment.seconds.start),
                        end: secondsToPercentage(segment.seconds.end),
                    },
                });
                lastEndSeconds = segment.seconds.end;
            }
        }

        validSegments = newValidSegments;
    });

    // Update segment styles when validSegments change
    $effect(() => {
        segmentStyles = validSegments.map((segment) => ({
            left: `${segment.percentage.start}%`,
            width: `${segment.percentage.end - segment.percentage.start}%`,
            color: segment.color,
        }));
    });

    function updateProgress(): void {
        const now = new Date();
        const totalSeconds = getSecondsOfDay(now.getTime());
        progressPercentage = secondsToPercentage(totalSeconds);
    }

    // Timer effect with cleanup
    $effect(() => {
        updateProgress();
        const intervalId = setInterval(updateProgress, 1000);
        return () => clearInterval(intervalId);
    });
</script>

<div class="time-progress" style="height: {height}; background-color: {backgroundColor}">
    <div class="progress-segments">
        {#each validSegments as _segment, i}
            <div
                class="progress-segment"
                style="
                    left: {segmentStyles[i].left};
                    width: {segmentStyles[i].width};
                    background-color: {segmentStyles[i].color};
                "
            ></div>
        {/each}
    </div>
    <div
        class="time-cursor"
        style="
            width: {cursorWidth};
            background-color: {cursorColor};
            left: {progressPercentage}%;
        "
    ></div>
    <div
        class="time-mask"
        style="
            width: {progressPercentage}%;
            background-color: {maskColor};
        "
    ></div>
</div>

<style>
    :global(.time-progress) {
        width: 100%;
        position: relative;
        overflow: hidden;
    }

    :global(.progress-segments) {
        width: 100%;
        height: 100%;
        position: relative;
    }

    :global(.progress-segment) {
        height: 100%;
        position: absolute;
        top: 0;
    }

    :global(.time-cursor) {
        position: absolute;
        top: 0;
        height: 100%;
        z-index: 2;
        transition: left 0.3s linear;
    }

    :global(.time-mask) {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        z-index: 1;
        transition: width 0.3s linear;
    }
</style>
