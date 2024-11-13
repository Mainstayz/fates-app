<script lang="ts">
    import Timeline from "$lib/Timeline.svelte";
    import { onMount } from "svelte";

    let timelineComponent: Timeline;

    // 初始数据
    const initialItems = [
        { id: 1, content: "事件 1", start: "2024-03-01" },
        { id: 2, content: "事件 2", start: "2024-03-03" },
    ];

    // 模拟实时添加数据
    onMount(() => {
        // 3 秒后添加新事件
        setTimeout(() => {
            timelineComponent.addItem({
                id: 3,
                content: "新事件",
                start: new Date(),
                end: new Date(new Date().getTime() + 1000 * 60 * 60),
            });
        }, 5000);
    });
</script>

<main>
    <h1>时间线演示</h1>
    <Timeline bind:this={timelineComponent} items={initialItems} />
</main>

<style>
    main {
        padding: 20px;
    }
</style>
