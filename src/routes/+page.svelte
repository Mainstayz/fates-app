<script lang="ts">
    import Timeline from "$lib/Timeline.svelte";
    import { onMount } from "svelte";

    let timelineComponent: Timeline;

    // 初始组
    const initialGroups = [
        { id: 1, content: "组 A" },
        { id: 2, content: "组 B" }
    ];

    // 初始数据
    const initialItems = [
        { id: 1, content: "事件 1", start: "2024-03-01", group: 1 },
        { id: 2, content: "事件 2", start: "2024-03-03", group: 2 }
    ];

    // 模拟实时添加数据
    onMount(() => {
        // 3 秒后添加新组和事件
        setTimeout(() => {
            // 添加新组
            timelineComponent.addGroup({
                id: 3,
                content: "新组 C"
            });

            // 添加新事件到新组
            timelineComponent.addItem({
                id: 3,
                content: "新事件",
                start: new Date(),
                end: new Date(new Date().getTime() + 1000 * 60 * 60),
                group: 3
            });
        }, 3000);

        // 5 秒后更新组名
        setTimeout(() => {
            timelineComponent.updateGroup({
                id: 3,
                content: "更新后的组 C"
            });
        }, 5000);
    });
</script>

<main>
    <h1>时间线演示</h1>
    <Timeline bind:this={timelineComponent} items={initialItems} groups={initialGroups} />
</main>

<style>
    main {
        padding: 20px;
    }
</style>
