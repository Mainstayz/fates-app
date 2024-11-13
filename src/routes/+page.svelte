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

    // 处理添加事件
    const handleAdd = (item: any, callback: (item: any | null) => void) => {
        const confirmed = window.confirm(`确认添加事件：${item.content}?`);
        if (confirmed) {
            callback(item); // 确认添加
        } else {
            callback(null); // 取消添加
        }
    };

    // 处理移动事件
    const handleMove = (item: any, callback: (item: any | null) => void) => {
        const title = `是否要移动事件到:\n开始：${item.start}\n结束：${item.end}?`;
        const confirmed = window.confirm(title);
        if (confirmed) {
            callback(item); // 确认移动
        } else {
            callback(null); // 取消移动
        }
    };

    // 处理正在移动
    const handleMoving = (item: any, callback: (item: any) => void) => {
        // 可以在这里添加移动限制逻辑
        callback(item);
    };

    // 处理更新事件
    const handleUpdate = (item: any, callback: (item: any | null) => void) => {
        const newContent = window.prompt('编辑事件内容：', item.content);
        if (newContent) {
            item.content = newContent;
            callback(item); // 确认更新
        } else {
            callback(null); // 取消更新
        }
    };

    // 处理删除事件
    const handleRemove = (item: any, callback: (item: any | null) => void) => {
        const confirmed = window.confirm(`确定要删除事件 ${item.content}?`);
        if (confirmed) {
            callback(item); // 确认删除
        } else {
            callback(null); // 取消删除
        }
    };

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

    // 导出所有数据的示例
    const handleExport = () => {
        const allItems = timelineComponent.getAllItems();
        const allGroups = timelineComponent.getAllGroups();

        console.log('所有事件：', allItems);
        console.log('所有分组：', allGroups);

        // 可以将数据转换为 JSON 字符串
        const exportData = {
            items: allItems,
            groups: allGroups
        };

        // 示例：下载为 JSON 文件
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timeline-export.json';
        a.click();
        URL.revokeObjectURL(url);
    };
</script>

<main>
    <h1>时间线演示</h1>
    <button on:click={handleExport}>导出数据</button>
    <Timeline
        bind:this={timelineComponent}
        items={initialItems}
        groups={initialGroups}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
    />
</main>

<style>
    main {
        padding: 20px;
    }
</style>
