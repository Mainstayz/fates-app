<script lang="ts">
    // 导入必要的组件和工具
    import { onMount } from "svelte";
    import * as Select from "$lib/components/ui/select";
    import PieChart from "./charts/PieChart.svelte";
    import BarChart from "./charts/BarChart.svelte";
    import TagDetailChart from "./charts/TagDetailChart.svelte";
    import type { TimelineItem } from "$lib/types";
    import {
        calculateTagStats,
        filterItemsByRange,
        type TimeRange,
        UNCLASSIFIED_TAG,
        OTHER_TAG,
    } from "$lib/utils/statistics";

    // 定义组件的属性和状态
    let { items }: { items: TimelineItem[] } = $props(); // 接收时间项数组作为属性

    // 定义响应式状态
    let selectedRange: TimeRange = $state("all"); // 选中的时间范围，默认为"全部"
    let selectedTag: string | null = $state(null); // 选中的标签，默认为 null

    // 定义时间范围选项
    const timeRanges = [
        { value: "all", label: "所有时间" },
        { value: "year", label: "今年来" },
        { value: "month", label: "最近一个月" },
        { value: "week", label: "最近一周" },
    ] as const;

    // 处理标签选择的函数
    function handleTagSelect(tag: string) {
        console.log("Selected Tag:", tag);
        selectedTag = tag;
    }

    // 获取图表数据的函数
    function getChartData() {
        try {
            const stats = calculateTagStats(items, selectedRange);
            const tags = Object.keys(stats);
            const durations = Object.values(stats);
            const totalDuration = durations.reduce((a, b) => a + b, 0);
            const durationHours = durations.map((d) => +(d / (1000 * 60 * 60)).toFixed(2));

            // Validate data before returning
            if (tags.length === 0 || durations.length === 0) {
                return null;
            }

            return { tags, durations, durationHours, totalDuration };
        } catch (error) {
            console.error("Error in getChartData:", error);
            return null;
        }
    }

    // 获取标签详细数据的函数
    /**
     * 获取标签详细数据的函数
     * 根据选中的标签返回相关时间项的详细信息
     * @returns {Array<{content: string, duration: number}>} 返回包含内容和时长的数组
     */
    function getTagDetailData() {
        // 如果没有选中标签，返回空数组
        if (!selectedTag) return [];

        // 根据时间范围筛选项目
        const filteredItems = filterItemsByRange(items, selectedRange);

        // 处理"其他"标签的特殊情况
        // 获取排名靠后的标签（第 10 个之后的所有标签）
        if (selectedTag === OTHER_TAG) {
            console.log('Processing "其他" tag');
            // 用于存储每个标签的总时长
            const tagDurations: { [key: string]: number } = {};

            // 计算每个标签的总时长
            filteredItems.forEach((item) => {
                if (!item.start || !item.end) return;
                const duration = new Date(item.end).getTime() - new Date(item.start).getTime();
                // 如果没有标签则使用空字符串
                const tags = !item.tags || item.tags.length === 0 ? [""] : item.tags;

                // 为每个标签累加时长
                tags.forEach((tag) => {
                    const tagName = tag.trim() || UNCLASSIFIED_TAG;
                    tagDurations[tagName] = (tagDurations[tagName] || 0) + duration;
                });
            });

            // 按时长降序排序标签
            const sortedEntries = Object.entries(tagDurations).sort(([, a], [, b]) => b - a);

            console.log("Total tags before filtering:", sortedEntries.length);

            // 如果标签总数不超过 10 个，则不需要"其他"分类
            if (sortedEntries.length <= 10) {
                console.log("Not enough tags for '其他' category");
                return [];
            }

            // 获取排名靠后的标签（第10个之后的所有标签）
            const otherTags = sortedEntries.slice(9).map(([tag]) => tag);
            console.log("Tags in '其他' category:", otherTags);

            // 筛选包含"其他"标签的时间项
            const result = filteredItems
                .filter((item) => {
                    const hasOtherTag = item.tags?.some((tag) => otherTags.includes(tag));
                    console.log("Item:", item.content, "has other tag:", hasOtherTag);
                    return hasOtherTag;
                })
                // 转换为所需的数据格式
                .map((item) => {
                    const duration = +(
                        (new Date(item.end!).getTime() - new Date(item.start).getTime()) /
                        (1000 * 60 * 60)
                    ).toFixed(2);
                    console.log("Mapped item:", item.content, "duration:", duration);
                    return {
                        content: item.content,
                        duration,
                    };
                })
                // 按时长降序排序并只取前 10 个
                .sort((a, b) => b.duration - a.duration)
                .slice(0, 10);

            console.log('Final result for "其他":', result);
            return result;
        }

        // 处理"未分类"标签的特殊情况
        if (selectedTag === UNCLASSIFIED_TAG) {
            console.log('Processing "未分类" tag');
            // 筛选没有标签或标签为空的时间项
            const result = filteredItems
                .filter((item) => !item.tags?.length || (item.tags.length === 1 && item.tags[0] === ""))
                .map((item) => ({
                    content: item.content,
                    duration: +(
                        (new Date(item.end!).getTime() - new Date(item.start).getTime()) /
                        (1000 * 60 * 60)
                    ).toFixed(2),
                }))
                .sort((a, b) => b.duration - a.duration)
                .slice(0, 10);

            console.log('Final result for "未分类":', result);
            return result;
        }

        // 处理普通标签
        console.log("Processing regular tag:", selectedTag);
        // 筛选包含所选标签的时间项
        const result = filteredItems
            .filter((item) => {
                const hasTag = item.tags?.includes(selectedTag ?? "");
                console.log("Item:", item.content, "has tag:", hasTag);
                return hasTag;
            })
            // 转换为所需的数据格式
            .map((item) => ({
                content: item.content,
                duration: +(
                    (new Date(item.end!).getTime() - new Date(item.start).getTime()) /
                    (1000 * 60 * 60)
                ).toFixed(2),
            }))
            // 按时长降序排序并只取前 10 个
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 10);

        console.log("Final result for regular tag:", result);
        return result;
    }

    $effect(() => {
        if (items?.length > 0) {
            const stats = calculateTagStats(items, selectedRange);
            const tags = Object.keys(stats);
            if (!selectedTag && tags.length > 0) {
                selectedTag = tags[0];
            }
        }
    });

    export function updateCharts(newItems: TimelineItem[]) {
        items = newItems;
    }
</script>

<div class="flex flex-col h-full">
    {#if items?.length > 0}
        <div class="w-[200px]">
            <Select.Root type="single" bind:value={selectedRange}>
                <Select.Trigger class="w-full">
                    <span>{timeRanges.find((r) => r.value === selectedRange)?.label || "选择时间范围"}</span>
                </Select.Trigger>
                <Select.Content>
                    <Select.Group>
                        {#each timeRanges as range}
                            <Select.Item value={range.value}>
                                {range.label}
                            </Select.Item>
                        {/each}
                    </Select.Group>
                </Select.Content>
            </Select.Root>
        </div>

        <div class="flex-1 flex flex-col pt-2 gap-2">
            <!-- 上部分图表 -->
            <div class="flex flex-row w-full flex-none h-2/4 border rounded-lg">
                <div class="w-1/3 flex items-center justify-center">
                    {#if items?.length > 0}
                        {@const chartData = getChartData()}
                        {#if chartData}
                            <PieChart
                                data={{
                                    tags: chartData.tags,
                                    durations: chartData.durations,
                                    totalDuration: chartData.totalDuration,
                                }}
                                onTagSelect={handleTagSelect}
                            />
                        {:else}
                            <div class="flex items-center justify-center h-full text-gray-500">
                                <p>无法生成图表数据</p>
                            </div>
                        {/if}
                    {/if}
                </div>
                <div class="w-2/3 flex items-center justify-center">
                    {#if items?.length > 0}
                        {@const chartData = getChartData()}
                        {#if chartData}
                            <BarChart
                                data={{
                                    tags: chartData.tags,
                                    durationHours: chartData.durationHours,
                                }}
                                onTagSelect={handleTagSelect}
                            />
                        {:else}
                            <div class="flex items-center justify-center h-full text-gray-500">
                                <p>无法生成图表数据</p>
                            </div>
                        {/if}
                    {/if}
                </div>
            </div>

            <!-- 下部分标签详情图表 -->
            <div class="w-full flex-1 border rounded-lg">
                {#if selectedTag}
                    {@const detailData = getTagDetailData()}
                    {#if detailData.length > 0}
                        <TagDetailChart data={detailData} {selectedTag} />
                    {:else}
                        <div class="flex items-center justify-center h-full text-gray-500">
                            <p>暂无详细数据</p>
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    {:else}
        <div class="flex flex-col items-center justify-center p-8 text-gray-500 bg-gray-50 rounded-lg">
            <h3 class="text-lg font-medium mb-2">暂无数据</h3>
            <p class="text-sm text-center">请添加一些时间记录来查看统计图表</p>
        </div>
    {/if}
</div>
