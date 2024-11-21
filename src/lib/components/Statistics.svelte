<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import ApexCharts from "apexcharts";
    import type { TimelineItem } from "$lib/types";
    import * as Select from "$lib/components/ui/select";

    // 类型定义
    type TimeRange = "all" | "year" | "month" | "week";

    // Props
    let { items }: { items: TimelineItem[] } = $props();

    // DOM 引用
    let pieChartElement: HTMLElement;
    let barChartElement: HTMLElement;

    // Chart 实例
    let pieChart: ApexCharts;
    let barChart: ApexCharts;

    // 时间范围状态和选项
    let selectedRange: TimeRange = $state("all");
    const timeRanges = [
        { value: "all", label: "所有时间" },
        { value: "year", label: "今年来" },
        { value: "month", label: "最近一个月" },
        { value: "week", label: "最近一周" },
    ] as const;

    // 根据选择的时间范围过滤数据
    function filterItemsByRange(items: TimelineItem[], range: string): TimelineItem[] {
        const now = new Date();
        const startDate = new Date();

        switch (range) {
            case "week":
                startDate.setDate(now.getDate() - 7);
                break;
            case "month":
                startDate.setMonth(now.getMonth() - 1);
                break;
            case "year":
                startDate.setFullYear(now.getFullYear(), 0, 1); // 今年 1 月 1 日
                break;
            default:
                return items; // 'all' 返回所有数据
        }

        return items.filter((item) => {
            const itemDate = new Date(item.start);
            return itemDate >= startDate && itemDate <= now;
        });
    }

    // 优化 calculateTagStats 函数
    function calculateTagStats(items: TimelineItem[]): { [key: string]: number } {
        const tagDurations: { [key: string]: number } = {};
        const filteredItems = filterItemsByRange(items, selectedRange);

        filteredItems.forEach((item) => {
            if (!item.start || !item.end) return;

            const duration = new Date(item.end).getTime() - new Date(item.start).getTime();
            // 修改这里：确保空标签或空数组被正确处理为"其他"
            const tags = !item.tags || item.tags.length === 0 ? ["其他"] : item.tags;

            tags.forEach((tag) => {
                // 确保标签不是空字符串
                const tagName = tag.trim() || "其他";
                tagDurations[tagName] = (tagDurations[tagName] || 0) + duration;
            });
        });

        return tagDurations;
    }

    // 将图表配置抽离为单独的函数
    function getPieChartOptions(tags: string[], durations: number[], totalDuration: number) {
        return {
            series: durations.map((d) => +((d / totalDuration) * 100).toFixed(1)),
            chart: {
                type: "donut",
                animations: {
                    enabled: true,
                    easing: "easeinout",
                    speed: 800,
                    animateGradually: { enabled: true, delay: 150 },
                    dynamicAnimation: { enabled: true, speed: 350 },
                },
            },
            labels: tags,
            title: { text: "标签占比分布 (%)", align: "center" },
            legend: { position: "bottom" },
            responsive: [
                {
                    breakpoint: 480,
                    options: {
                        chart: { width: 300 },
                        legend: { position: "bottom" },
                    },
                },
            ],
            theme: { palette: "palette8" },
        };
    }

    function getBarChartOptions(tags: string[], durationHours: number[]) {
        console.log("getBarChartOptions", tags, durationHours);

        // 创建包含标签和时长的对象数组，以便排序
        const combined = tags.map((tag, index) => ({
            tag,
            duration: durationHours[index],
        }));

        // 按时长降序排序
        combined.sort((a, b) => b.duration - a.duration);

        // 分离排序后的标签和时长
        const sortedTags = combined.map((item) => item.tag);
        const sortedHours = combined.map((item) => item.duration);

        return {
            series: [
                {
                    name: "时长（小时）",
                    data: sortedHours,
                    color: "#3B82F6", // 设置为蓝色
                },
            ],
            chart: {
                type: "bar",
                animations: {
                    enabled: true,
                    easing: "easeinout",
                    speed: 800,
                    dynamicAnimation: { enabled: true, speed: 350 },
                },
            },
            plotOptions: { bar: { borderRadius: 4, horizontal: true } },
            dataLabels: { enabled: false },
            xaxis: { categories: sortedTags },
            // yaxis: { title: { text: '小时' } },
            title: { text: "标签时长分布（小时）", align: "center" },
            theme: { palette: "palette8" },
        };
    }

    function createCharts() {
        // 确保 DOM 元素存在
        if (!pieChartElement || !barChartElement) {
            console.log("DOM elements not ready yet");
            return;
        }

        console.log("Creating charts ...");
        const tagStats = calculateTagStats(items);
        const tags = Object.keys(tagStats);
        const durations = Object.values(tagStats);
        const totalDuration = durations.reduce((a, b) => a + b, 0);
        const durationHours = durations.map((d) => +(d / (1000 * 60 * 60)).toFixed(2));

        // 销毁现有图表
        if (pieChart) {
            pieChart.destroy();
            pieChart = null;
        }
        if (barChart) {
            barChart.destroy();
            barChart = null;
        }

        // 创建新图表
        try {
            pieChart = new ApexCharts(pieChartElement, getPieChartOptions(tags, durations, totalDuration));
            barChart = new ApexCharts(barChartElement, getBarChartOptions(tags, durationHours));

            pieChart.render();
            barChart.render();
        } catch (error) {
            console.error("Error creating charts:", error);
        }
    }

    onMount(() => {
        // 使用 setTimeout 确保 DOM 完全准备好
        setTimeout(() => {
            if (items && items.length > 0) {
                createCharts();
            }
        }, 0);
    });

    onDestroy(() => {
        if (pieChart) {
            pieChart.destroy();
            pieChart = null;
        }
        if (barChart) {
            barChart.destroy();
            barChart = null;
        }
    });

    // 监听 items 和 selectedRange 变化

    export function updateCharts(newItems: TimelineItem[]) {
        items = newItems;
        console.log("updateCharts called with items:", items);

        if (items.length === 0) {
            if (pieChart) {
                pieChart.destroy();
                pieChart = null;
            }
            if (barChart) {
                barChart.destroy();
                barChart = null;
            }
            return;
        }

        // 使用 setTimeout 确保 DOM 更新完成
        setTimeout(() => {
            createCharts();
        }, 0);
    }

    // 处理时间范围变化
    function handleValueSelect(event: CustomEvent<TimeRange>) {
        selectedRange = event.detail;
    }

    // 监听 selectedRange 变化
    $effect(() => {
        console.log("selectedRange changed:", selectedRange);
        createCharts();
    });

</script>

<div class="flex flex-col h-full w-full space-y-4">
    <!-- 图表容器 -->
    {#if items && items.length > 0}
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
        <!-- 修改图表容器样式 -->
        <div class="flex flex-col md:flex-row gap-4 w-full flex-1">
            <div class="w-full md:w-1/3 h-full">
                <div bind:this={pieChartElement} class="h-full w-full"></div>
            </div>
            <div class="w-full md:w-2/3 h-full">
                <div bind:this={barChartElement} class="h-full w-full"></div>
            </div>
        </div>
    {:else}
        <h2 class="text-2xl font-semibold mb-4">统计信息</h2>
        <!-- 空状态显示也撑满容器 -->
        <div class="flex flex-col items-center justify-center h-full w-full p-8 text-gray-500 bg-gray-50 rounded-lg">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-16 h-16 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
            </svg>
            <h3 class="text-lg font-medium mb-2">暂无数据</h3>
            <p class="text-sm text-center">请添加一些时间记录来查看统计图表</p>
        </div>
    {/if}
</div>
