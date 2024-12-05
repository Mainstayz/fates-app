<!-- TimeProgressBar.svelte -->
<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    interface TimeSegment {
        start: number;
        end: number;
        color: string;
    }

    // Props
    export let height = "100%";
    export let cursorWidth = "2px";
    export let cursorColor = "#000";
    export let maskColor = "rgba(0, 0, 0, 0.3)";
    export let backgroundColor = "#f0f0f0";
    export let timeSegments: TimeSegment[] = [];

    let progressPercentage = 0;
    let intervalId: number;
    let validSegments: Array<TimeSegment & { percentage: { start: number; end: number } }> = [];

    // 获取一天中的总秒数
    const SECONDS_PER_DAY = 24 * 60 * 60;

    // 将时间戳转换为一天中的秒数
    function getSecondsOfDay(timestamp: number): number {
        const date = new Date(timestamp);
        return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
    }

    // 将秒数转换为百分比
    function secondsToPercentage(seconds: number): number {
        return (seconds / SECONDS_PER_DAY) * 100;
    }

    $: {
        const converted = timeSegments
            .map((segment) => ({
                ...segment,
                seconds: {
                    start: getSecondsOfDay(segment.start),
                    end: getSecondsOfDay(segment.end),
                },
            }))
            .sort((a, b) => a.seconds.start - b.seconds.start);

        validSegments = [];
        let lastEndSeconds = 0;

        converted.forEach((segment) => {
            if (
                segment.seconds.start >= lastEndSeconds &&
                segment.seconds.start < segment.seconds.end &&
                segment.seconds.start >= 0 &&
                segment.seconds.end <= SECONDS_PER_DAY &&
                segment.seconds.end > segment.seconds.start
            ) {
                validSegments.push({
                    ...segment,
                    percentage: {
                        start: secondsToPercentage(segment.seconds.start),
                        end: secondsToPercentage(segment.seconds.end),
                    },
                });
                lastEndSeconds = segment.seconds.end;
            }
        });
    }

    $: segmentStyles = validSegments.map((segment) => ({
        left: `${segment.percentage.start}%`,
        width: `${segment.percentage.end - segment.percentage.start}%`,
        color: segment.color,
    }));

    function updateProgress(): void {
        const now = new Date();
        const totalSeconds = getSecondsOfDay(now.getTime());
        progressPercentage = secondsToPercentage(totalSeconds);
    }

    onMount(() => {
        updateProgress();
        intervalId = window.setInterval(updateProgress, 1000);
    });

    onDestroy(() => {
        if (intervalId) {
            window.clearInterval(intervalId);
        }
    });
</script>

<div class="time-progress" style="height: {height}; background-color: {backgroundColor}">
    <div class="progress-segments">
        {#each validSegments as segment, i}
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
