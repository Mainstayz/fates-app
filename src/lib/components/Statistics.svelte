<script lang="ts">
    import { onMount } from "svelte";
    import * as Select from "$lib/components/ui/select";
    import PieChart from "./charts/PieChart.svelte";
    import BarChart from "./charts/BarChart.svelte";
    import TagDetailChart from "./charts/TagDetailChart.svelte";
    import type { TimelineItem } from "$lib/types";
    import { calculateTagStats, filterItemsByRange, type TimeRange } from "$lib/utils/statistics";

    let { items }: { items: TimelineItem[] } = $props();

    let selectedRange: TimeRange = $state("all");
    let selectedTag: string | null = $state(null);

    const timeRanges = [
        { value: "all", label: "所有时间" },
        { value: "year", label: "今年来" },
        { value: "month", label: "最近一个月" },
        { value: "week", label: "最近一周" },
    ] as const;

    function handleTagSelect(tag: string) {
        selectedTag = tag;
    }

    function getChartData() {
        const stats = calculateTagStats(items, selectedRange);
        const tags = Object.keys(stats);
        const durations = Object.values(stats);
        const totalDuration = durations.reduce((a, b) => a + b, 0);
        const durationHours = durations.map((d) => +(d / (1000 * 60 * 60)).toFixed(2));

        return {
            tags,
            durations,
            durationHours,
            totalDuration,
        };
    }

    function getTagDetailData() {
        console.log("getTagDetailData called with selectedTag:", selectedTag);

        if (!selectedTag) {
            console.log("No selectedTag, returning empty array");
            return [];
        }

        const filteredItems = filterItemsByRange(items, selectedRange);
        console.log("Filtered items by range:", filteredItems.length);

        if (selectedTag === "其他") {
            console.log('Processing "其他" tag');
            const tagDurations: { [key: string]: number } = {};

            filteredItems.forEach((item) => {
                if (!item.start || !item.end) return;
                const duration = new Date(item.end).getTime() - new Date(item.start).getTime();
                const tags = !item.tags || item.tags.length === 0 ? [""] : item.tags;

                tags.forEach((tag) => {
                    const tagName = tag.trim() || "未分类";
                    tagDurations[tagName] = (tagDurations[tagName] || 0) + duration;
                });
            });

            const sortedEntries = Object.entries(tagDurations)
                .sort(([, a], [, b]) => b - a);

            console.log("Total tags before filtering:", sortedEntries.length);

            if (sortedEntries.length <= 10) {
                console.log("Not enough tags for '其他' category");
                return [];
            }

            const otherTags = sortedEntries.slice(9).map(([tag]) => tag);
            console.log("Tags in '其他' category:", otherTags);

            const result = filteredItems
                .filter((item) => {
                    const hasOtherTag = item.tags?.some((tag) => otherTags.includes(tag));
                    console.log("Item:", item.content, "has other tag:", hasOtherTag);
                    return hasOtherTag;
                })
                .map((item) => {
                    const duration = +(
                        (new Date(item.end).getTime() - new Date(item.start).getTime()) /
                        (1000 * 60 * 60)
                    ).toFixed(2);
                    console.log("Mapped item:", item.content, "duration:", duration);
                    return {
                        content: item.content,
                        duration,
                    };
                })
                .sort((a, b) => b.duration - a.duration)
                .slice(0, 10);

            console.log('Final result for "其他":', result);
            return result;
        }

        if (selectedTag === "未分类") {
            console.log('Processing "未分类" tag');
            const result = filteredItems
                .filter((item) => !item.tags?.length || (item.tags.length === 1 && item.tags[0] === ""))
                .map((item) => ({
                    content: item.content,
                    duration: +(
                        (new Date(item.end).getTime() - new Date(item.start).getTime()) /
                        (1000 * 60 * 60)
                    ).toFixed(2),
                }))
                .sort((a, b) => b.duration - a.duration)
                .slice(0, 10);

            console.log('Final result for "未分类":', result);
            return result;
        }

        console.log("Processing regular tag:", selectedTag);
        const result = filteredItems
            .filter((item) => {
                const hasTag = item.tags?.includes(selectedTag ?? "");
                console.log("Item:", item.content, "has tag:", hasTag);
                return hasTag;
            })
            .map((item) => ({
                content: item.content,
                duration: +((new Date(item.end).getTime() - new Date(item.start).getTime()) / (1000 * 60 * 60)).toFixed(
                    2
                ),
            }))
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

        <div class="flex-1 flex flex-col pt-4 gap-4">
            <!-- 上部分图表 -->
            <div class="flex flex-row w-full flex-none h-2/4 border rounded-lg">
                <div class="w-1/3 flex items-center justify-center">
                    {#if items?.length > 0}
                        {@const chartData = getChartData()}
                        <PieChart
                            data={{
                                tags: chartData.tags,
                                durations: chartData.durations,
                                totalDuration: chartData.totalDuration,
                            }}
                            onTagSelect={handleTagSelect}
                        />
                    {/if}
                </div>
                <div class="w-2/3 flex items-center justify-center">
                    {#if items?.length > 0}
                        {@const chartData = getChartData()}
                        <BarChart
                            data={{
                                tags: chartData.tags,
                                durationHours: chartData.durationHours,
                            }}
                            onTagSelect={handleTagSelect}
                        />
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
