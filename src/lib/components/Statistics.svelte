<script lang="ts">
    import * as Select from "$lib/components/ui/select";
    import PieChart from "./charts/pie-chart.svelte";
    import BarChart from "./charts/bar-chart.svelte";
    import TagDetailChart from "./charts/tag-detail-chart.svelte";
    import type { TimelineItem } from "$lib/types";
    import {
        calculateTagStats,
        filterItemsByRange,
        type TimeRange,
        UNCLASSIFIED_TAG,
        OTHER_TAG,
    } from "$lib/utils/statistics";
    import { t } from "svelte-i18n";

    // define component properties and state
    let { items }: { items: TimelineItem[] } = $props(); // receive timeline items as props

    // define reactive state
    let selectedRange: TimeRange = $state("all"); // selected time range, default is "all"
    let selectedTag: string | null = $state(null); // selected tag, default is null

    // define time range options
    const timeRanges = $derived([
        { value: "all", label: $t("app.statistics.timeRanges.all") },
        { value: "year", label: $t("app.statistics.timeRanges.year") },
        { value: "month", label: $t("app.statistics.timeRanges.month") },
        { value: "week", label: $t("app.statistics.timeRanges.week") },
    ]);

    // handle tag selection
    function handleTagSelect(tag: string) {
        console.log("Selected Tag:", tag);
        selectedTag = tag;
    }

    // get chart data
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

    function getTagDetailData() {
        // if no tag selected, return empty array
        if (!selectedTag) return [];

        // filter items by time range
        const filteredItems = filterItemsByRange(items, selectedRange);

        // handle "other" tag special case
        // get tags ranked lower (all tags after the 10th)
        if (selectedTag === OTHER_TAG) {
            // store total duration of each tag
            const tagDurations: { [key: string]: number } = {};

            // calculate total duration of each tag
            filteredItems.forEach((item) => {
                if (!item.start || !item.end) return;
                const duration = new Date(item.end).getTime() - new Date(item.start).getTime();
                // if no tags, use empty string
                const tags = !item.tags || item.tags.length === 0 ? [""] : item.tags;

                // add duration to each tag
                tags.forEach((tag) => {
                    const tagName = tag.trim() || UNCLASSIFIED_TAG;
                    tagDurations[tagName] = (tagDurations[tagName] || 0) + duration;
                });
            });

            // sort tags by duration in descending order
            const sortedEntries = Object.entries(tagDurations).sort(([, a], [, b]) => b - a);

            console.log("Total tags before filtering:", sortedEntries.length);

            // if tag count is not more than 10, no need to "other" category
            if (sortedEntries.length <= 10) {
                console.log("Not enough tags for 'other' category");
                return [];
            }

            // get tags ranked lower (all tags after the 10th)
            const otherTags = sortedEntries.slice(9).map(([tag]) => tag);
            console.log("Tags in 'other' category:", otherTags);

            // filter items containing "other" tag
            const result = filteredItems
                .filter((item) => {
                    const hasOtherTag = item.tags?.some((tag) => otherTags.includes(tag));
                    console.log("Item:", item.content, "has other tag:", hasOtherTag);
                    return hasOtherTag;
                })
                // convert to required data format
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
                // sort by duration in descending order and only take top 10
                .sort((a, b) => b.duration - a.duration)
                .slice(0, 10);

            console.log('Final result for "other":', result);
            return result;
        }

        // handle "unclassified" tag special case
        if (selectedTag === UNCLASSIFIED_TAG) {
            console.log('Processing "unclassified" tag');
            // filter items without tags or tags are empty
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

            console.log('Final result for "unclassified":', result);
            return result;
        }

        // handle regular tag
        console.log("Processing regular tag:", selectedTag);
        // filter items containing selected tag
        const result = filteredItems
            .filter((item) => {
                const hasTag = item.tags?.includes(selectedTag ?? "");
                console.log("Item:", item.content, "has tag:", hasTag);
                return hasTag;
            })
            // convert to required data format
            .map((item) => ({
                content: item.content,
                duration: +(
                    (new Date(item.end!).getTime() - new Date(item.start).getTime()) /
                    (1000 * 60 * 60)
                ).toFixed(2),
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
                    <span
                        >{timeRanges.find((r) => r.value === selectedRange)?.label ||
                            $t("app.statistics.selectTimeRange")}</span
                    >
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
                                <p>{$t("app.statistics.noChartData")}</p>
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
                                <p>{$t("app.statistics.noChartData")}</p>
                            </div>
                        {/if}
                    {/if}
                </div>
            </div>

            <div class="w-full flex-1 border rounded-lg">
                {#if selectedTag}
                    {@const detailData = getTagDetailData()}
                    {#if detailData.length > 0}
                        <TagDetailChart data={detailData} {selectedTag} />
                    {:else}
                        <div class="flex items-center justify-center h-full text-gray-500">
                            <p>{$t("app.statistics.noDetailData")}</p>
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    {:else}
        <div class="flex flex-col items-center justify-center p-8 text-gray-500 bg-gray-50 rounded-lg">
            <h3 class="text-lg font-medium mb-2">{$t("app.statistics.noData")}</h3>
            <p class="text-sm text-center">{$t("app.statistics.noDataDescription")}</p>
        </div>
    {/if}
</div>
