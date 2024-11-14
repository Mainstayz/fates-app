<script lang="ts">
    import Timeline from "$lib/Timeline.svelte";
    import type { TimelineGroup, TimelineItem } from "$lib/types";
    import { onMount } from "svelte";
    import { invoke } from "@tauri-apps/api/core";
    import { confirm, ask, message } from "@tauri-apps/plugin-dialog";
    import { Button } from "$lib/components/ui/button";
    import { Card } from "$lib/components/ui/card";
    import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/components/ui/tabs";
    import { Settings } from "lucide-svelte";

    let timelineComponent: Timeline;

    // 使用响应式声明存储时间线数据
    let groups: TimelineGroup[] = [];
    let items: TimelineItem[] = [];

    // 处理添加事件
    const handleAdd = async (item: any, callback: (item: any | null) => void) => {
        console.log("handleAdd", item);
        callback(item); // 确认添加
    };

    // 处理移动事件
    const handleMove = async (item: any, callback: (item: any | null) => void) => {
        console.log("handleMove", item);
        callback(item); // 确认移动
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
            title: "删除确认",
            kind: "warning",
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
            items: timelineComponent.getAllItems(),
        };
        console.log("Timeline data:", timelineData);
        try {
            await invoke("save_timeline_data", { data: timelineData });
            console.log("Timeline data saved successfully");
        } catch (error) {
            console.error("Failed to save timeline data:", error);
        }
    }

    // 加载时间线数据
    async function loadTimelineData() {
        try {
            const result = await invoke<{ groups: any[]; items: any[] } | null>("load_timeline_data");
            if (result) {
                // 直接更新响应式变量
                groups = result.groups;
                items = result.items;

                // 使用现有的方法更新时间线
                if (timelineComponent) {
                    // 清除所有现有数据
                    const existingItems = timelineComponent.getAllItems();
                    existingItems.forEach((item) => {
                        timelineComponent.removeItem(item.id);
                    });

                    const existingGroups = timelineComponent.getAllGroups();
                    existingGroups.forEach((group) => {
                        timelineComponent.removeGroup(group.id);
                    });

                    // 添加新数据（先添加组，再添加项目）
                    result.groups.forEach((group) => {
                        timelineComponent.addGroup(group);
                    });

                    result.items.forEach((item) => {
                        timelineComponent.addItem(item);
                    });
                }
            }
        } catch (error) {
            console.error("Failed to load timeline data:", error);
        }
    }

    // 自动保存功能
    let autoSaveInterval: ReturnType<typeof setInterval>;

    onMount(() => {
        // 加载保存的数据
        loadTimelineData();

        // 设置自动保存（每 5 分钟）
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
            // 获取当前最大 ID
            const existingGroups = timelineComponent.getAllGroups();
            const existingItems = timelineComponent.getAllItems();
            const maxGroupId = Math.max(0, ...existingGroups.map((g) => Number(g.id)));
            const maxItemId = Math.max(0, ...existingItems.map((i) => Number(i.id)));

            // 使用新的 ID 添加数据
            const newGroupId = maxGroupId + 1;
            const newItemId = maxItemId + 1;

            // 添加新组
            // timelineComponent.addGroup({
            //     id: newGroupId,
            //     content: "新组 C",
            // });

            // 添加新事件到新组
            // timelineComponent.addItem({
            //     id: newItemId,
            //     content: "新事件",
            //     start: new Date(),
            //     end: new Date(new Date().getTime() + 1000 * 60 * 60),
            //     group: newGroupId,
            // });

            // 5 秒后更新组名
            // setTimeout(() => {
            //     timelineComponent.updateGroup({
            //         id: newGroupId,
            //         content: "更新后的组 C",
            //     });
            // }, 2000);
        }, 3000);
    });

    // 导出所有数据的示例
    const handleExport = () => {
        const allItems = timelineComponent.getAllItems();
        const allGroups = timelineComponent.getAllGroups();

        console.log("所有事件：", allItems);
        console.log("所有分组：", allGroups);

        // 可以将数据转换为 JSON 字符串
        const exportData = {
            items: allItems,
            groups: allGroups,
        };

        // 示例：下载为 JSON 文件
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "timeline-export.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    // 添加一个变量来跟踪当前选中的标签页
    let currentTab = "timeline";
</script>

<main class="container mx-auto p-4 space-y-4">
    <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold">时间追踪管理</h1>
    </div>

    <div class="flex items-center justify-between">
        <Tabs value={currentTab} onValueChange={(value) => (currentTab = value)} class="w-[400px]">
            <TabsList>
                <TabsTrigger value="timeline">时间线</TabsTrigger>
                <TabsTrigger value="statistics">统计</TabsTrigger>
            </TabsList>
        </Tabs>

        <Button variant="outline" size="icon">
            <Settings class="h-4 w-4" />
        </Button>
    </div>

    <div class="h-px bg-border" />

    <Tabs value={currentTab}>
        <TabsContent value="timeline">
            <!-- 设置水平方向 p-6 ，垂直方向 p-4 -->
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
        </TabsContent>

        <TabsContent value="statistics">
            <Card class="p-6">
                <h2 class="text-2xl font-semibold mb-4">统计信息</h2>
                <p>这里将显示统计信息...</p>
            </Card>
        </TabsContent>
    </Tabs>
</main>

<style>
    /* 可以删除之前的样式，因为现在使用 Tailwind CSS */
</style>
