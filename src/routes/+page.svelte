<script lang="ts">
    import Timeline from "$lib/Timeline.svelte";
    import type { TimelineGroup, TimelineItem } from "$lib/types";
    import { onMount } from "svelte";
    import { invoke } from '@tauri-apps/api/core';
    import { confirm, ask ,message} from '@tauri-apps/plugin-dialog';

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

    // 使用响应式声明存储时间线数据
    let groups: TimelineGroup[] = [...initialGroups];
    let items: TimelineItem[] = [...initialItems];

    // 处理添加事件
    const handleAdd = async (item: any, callback: (item: any | null) => void) => {
        const confirmed = await ask(`确认添加事件：${item.content}?`, {
            title: '添加确认',
            kind: 'warning',
        });

        if (confirmed) {
            callback(item); // 确认添加
        } else {
            callback(null); // 取消添加
        }
    };

    // 处理移动事件
    const handleMove = async (item: any, callback: (item: any | null) => void) => {
        const title = `是否要移动事件到:\n开始：${item.start}\n结束：${item.end}?`;
        const confirmed = await ask(title, {
            title: '移动确认',
            kind: 'warning',
        });

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
    const handleUpdate = async (item: any, callback: (item: any | null) => void) => {
        callback(item);
        await saveTimelineData(); // 删除后保存
    };

    // 处理删除事件
    const handleRemove = async (item: any, callback: (item: any | null) => void) => {
        const confirmed = await confirm(`确定要删除事件 ${item.content}?`, {
            title: '删除确认',
            kind: 'warning'
        });

        if (confirmed) {
            callback(item);
            await saveTimelineData(); // 删除后保存
        } else {
            callback(null);
        }
    };

    // 保存时间线数据
    async function saveTimelineData() {
        const timelineData = {
            groups: timelineComponent.getAllGroups(),
            items: timelineComponent.getAllItems()
        };

        try {
            await invoke('save_timeline_data', { data: timelineData });
            console.log('Timeline data saved successfully');
        } catch (error) {
            console.error('Failed to save timeline data:', error);
        }
    }

    // 加载时间线数据
    async function loadTimelineData() {
        try {
            const result = await invoke<{ groups: any[], items: any[] } | null>('load_timeline_data');
            if (result) {
                // 直接更新响应式变量
                groups = result.groups;
                items = result.items;

                // 使用现有的方法更新时间线
                if (timelineComponent) {
                    // 清除所有现有数据
                    const existingItems = timelineComponent.getAllItems();
                    existingItems.forEach(item => {
                        timelineComponent.removeItem(item.id);
                    });

                    const existingGroups = timelineComponent.getAllGroups();
                    existingGroups.forEach(group => {
                        timelineComponent.removeGroup(group.id);
                    });

                    // 添加新数据（先添加组，再添加项目）
                    result.groups.forEach(group => {
                        timelineComponent.addGroup(group);
                    });

                    result.items.forEach(item => {
                        timelineComponent.addItem(item);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load timeline data:', error);
        }
    }

    // 自动保存功能
    let autoSaveInterval: ReturnType<typeof setInterval>;

    onMount(() => {
        // 加载保存的数据
        loadTimelineData();

        // 设置自动保存（每5分钟）
        autoSaveInterval = setInterval(saveTimelineData, 5 * 60 * 1000);

        return () => {
            clearInterval(autoSaveInterval);
            saveTimelineData();
        };
    });

    // 模拟实时添加数据
    onMount(() => {
        // 3 秒后添加新组和事件
        setTimeout(() => {
            // 获取当前最大ID
            const existingGroups = timelineComponent.getAllGroups();
            const existingItems = timelineComponent.getAllItems();
            const maxGroupId = Math.max(0, ...existingGroups.map(g => Number(g.id)));
            const maxItemId = Math.max(0, ...existingItems.map(i => Number(i.id)));

            // 使用新的ID添加数据
            const newGroupId = maxGroupId + 1;
            const newItemId = maxItemId + 1;

            // 添加新组
            timelineComponent.addGroup({
                id: newGroupId,
                content: "新组 C"
            });

            // 添加新事件到新组
            timelineComponent.addItem({
                id: newItemId,
                content: "新事件",
                start: new Date(),
                end: new Date(new Date().getTime() + 1000 * 60 * 60),
                group: newGroupId
            });

            // 5 秒后更新组名
            setTimeout(() => {
                timelineComponent.updateGroup({
                    id: newGroupId,
                    content: "更新后的组 C"
                });
            }, 2000);
        }, 3000);
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
    <div class="timeline-controls">
        <button on:click={saveTimelineData}>保存时间线</button>
        <button on:click={loadTimelineData}>加载时间线</button>
        <button on:click={handleExport}>导出数据</button>
    </div>
    <Timeline
        bind:this={timelineComponent}
        {items}
        {groups}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
        onMove={handleMove}
        onMoving={handleMoving}
    />
</main>

<style>
    main {
        padding: 20px;
    }

    .timeline-controls {
        margin: 10px 0;
        padding: 10px 0;
        border-bottom: 1px solid #ccc;
    }

    button {
        margin-right: 10px;
        padding: 5px 10px;
        cursor: pointer;
    }
</style>
