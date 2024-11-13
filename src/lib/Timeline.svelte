<script lang="ts">
import { onMount } from 'svelte';
import { Timeline, DataSet } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.css";

let container: HTMLElement;

onMount(() => {
    // 创建示例数据
    const items = new DataSet([
        {id: 1, content: '事件 1', start: '2024-03-01'},
        {id: 2, content: '事件 2', start: '2024-03-03'},
        {id: 3, content: '事件 3', start: '2024-03-05', end: '2024-03-08'}
    ]);

    // 配置选项
    const options = {
        locale: 'zh_CN',
        height: '400px'
    };

    // 初始化时间线
    new Timeline(container, items, options);
});
</script>

<div bind:this={container} />

<style>
div {
    width: 100%;
    height: 400px;
    margin: 20px 0;
}
</style>
