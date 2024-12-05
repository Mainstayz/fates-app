<!-- TimeProgressBar.svelte -->
<script lang="ts">
    interface TimeSegment {
        start: number;
        end: number;
        color: string;
    }

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

    // 处理时间重叠的函数
    function handleTimeOverlap(segments: Array<{ seconds: { start: number; end: number } } & TimeSegment>) {
        if (segments.length === 0) return [];

        const result = [segments[0]];

        for (let i = 1; i < segments.length; i++) {
            const current = segments[i];
            const previous = result[result.length - 1];

            // 如果当前段的开始时间小于前一段的结束时间（重叠）
            if (current.seconds.start < previous.seconds.end) {
                // 如果当前段的结束时间大于前一段的结束时间
                if (current.seconds.end > previous.seconds.end) {
                    // 修改当前段的开始时间为前一段的结束时间
                    result.push({
                        ...current,
                        start: new Date(previous.end).getTime(),
                        seconds: {
                            start: previous.seconds.end,
                            end: current.seconds.end
                        }
                    });
                }
                // 如果当前段的结束时间小于等于前一段的结束时间，则忽略当前段
            } else {
                // 没有重叠，直接添加当前段
                result.push(current);
            }
        }

        return result;
    }

    // Process timeSegments when they change
    $effect(() => {
        const converted = timeSegments
            .map((segment) => ({
                ...segment,
                seconds: {
                    start: getSecondsOfDay(segment.start),
                    end: getSecondsOfDay(segment.end),
                },
            }))
            .sort((a, b) => a.seconds.start - b.seconds.start);

        // 处理时间重叠
        const overlappingHandled = handleTimeOverlap(converted);

        const newValidSegments = [];

        for (const segment of overlappingHandled) {
            if (
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
