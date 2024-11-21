<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import ApexCharts from "apexcharts";
    import type { TimelineItem } from "$lib/types";
    import * as Select from "$lib/components/ui/select";

    // 类型定义
    type TimeRange = "all" | "year" | "month" | "week";

    // Props
    let { items }: { items: TimelineItem[] } = $props();

    // 未分类
    const unclassifiedTag = "未分类";
    // 其他
    const otherTag = "其他";

    // DOM 引用
    let pieChartElement: HTMLElement;
    let barChartElement: HTMLElement;
    let tagsBarChartElement: HTMLElement;

    // Chart 实例
    let pieChart: ApexCharts;
    let barChart: ApexCharts;
    let tagsBarChart: ApexCharts;

    // 时间范围状态和选项
    let selectedRange: TimeRange = $state("all");
    const timeRanges = [
        { value: "all", label: "所有时间" },
        { value: "year", label: "今年来" },
        { value: "month", label: "最近一个月" },
        { value: "week", label: "最近一周" },
    ] as const;

    // 在 script 标签内添加新的变量和函数
    let selectedTag: string | null = null;

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

    // 修改 calculateTagStats 函数
    function calculateTagStats(items: TimelineItem[]): { [key: string]: number } {
        const tagDurations: { [key: string]: number } = {};
        const filteredItems = filterItemsByRange(items, selectedRange);

        filteredItems.forEach((item) => {
            if (!item.start || !item.end) return;

            const duration = new Date(item.end).getTime() - new Date(item.start).getTime();

            const tags = !item.tags || item.tags.length === 0 ? [""] : item.tags;

            tags.forEach((tag) => {
                const tagName = tag.trim() || unclassifiedTag;
                tagDurations[tagName] = (tagDurations[tagName] || 0) + duration;
            });
        });

        // 对标签按时长进行排序
        const sortedEntries = Object.entries(tagDurations).sort(([, a], [, b]) => b - a);

        // 如果标签数量超过 10 个，将剩余的合并到"其他"类别
        if (sortedEntries.length > 10) {
            const top9Entries = sortedEntries.slice(0, 9);
            const remainingEntries = sortedEntries.slice(9);

            // 计算其他类别的总时长
            const othersDuration = remainingEntries.reduce((sum, [, duration]) => sum + duration, 0);

            // 创建新的结果对象
            const result: { [key: string]: number } = {};
            top9Entries.forEach(([tag, duration]) => {
                result[tag] = duration;
            });
            result[otherTag] = othersDuration;

            return result;
        }

        return tagDurations;
    }

    // 将图表配置抽离为单独的函数，左上
    function getPieChartOptions(tags: string[], durations: number[], totalDuration: number) {
        return {
            series: durations.map((d) => +((d / totalDuration) * 100).toFixed(1)),
            chart: {
                type: "donut",
                height: "100%", // 改为 100%
                width: "100%", // 添加宽度 100%
                animations: {
                    enabled: true,
                    easing: "easeinout",
                    speed: 800,
                    animateGradually: { enabled: true, delay: 150 },
                    dynamicAnimation: { enabled: true, speed: 350 },
                },
                events: {
                    dataPointSelection: handleBarChartClick,
                },
            },
            labels: tags,
            title: {
                // text: "标签占比分布 (%)",
                align: "center",
            },
            legend: { position: "bottom" },
            responsive: [
                {
                    breakpoint: 480,
                    options: {
                        chart: {
                            height: "100%", // 修改响应式配置
                            width: "100%",
                        },
                        legend: { position: "bottom" },
                    },
                },
            ],
            theme: { palette: "palette8" },
        };
    }

    // 修改 handleBarChartClick 函数以处理"其他"类别
    function handleBarChartClick(event: any, chartContext: any, config: any) {
        console.log("handleBarChartClick called with event:", event, "chartContext:", chartContext, "config:", config);
        const tagIndex = config.dataPointIndex;
        if (tagIndex !== -1) {
            const tagStats = calculateTagStats(items);
            const tags = Object.keys(tagStats);
            // 获取排序后的标签
            const sortedTags = Object.entries(tagStats)
                .sort(([, a], [, b]) => b - a)
                .map(([tag]) => tag);

            // 如果点击的是"其他"类别，则不更新选中标签
            if (sortedTags[tagIndex] === otherTag) {
                return;
            }

            selectedTag = sortedTags[tagIndex];
            updateTagsDetailChart();
        }
    }

    // 添加更新标签详情图表的函数，下面图表
    function updateTagsDetailChart() {
        if (!selectedTag || !tagsBarChartElement) return;

        const filteredItems = filterItemsByRange(items, selectedRange).filter(
            (item) => {
                if (selectedTag === unclassifiedTag) {
                    return (item.tags.length === 1 && item.tags[0] === "") || !item.tags || item.tags.length === 0;
                }
                return item.tags && item.tags.includes(selectedTag);
            }
        );

        console.log("updateTagsDetailChart called with selectedTag:", selectedTag, "filteredItems:", filteredItems);
        let detailData = filteredItems.map((item) => ({
            content: item.content,
            duration: ((new Date(item.end).getTime() - new Date(item.start).getTime()) / (1000 * 60 * 60)).toFixed(2),
        }));

        // 添加排序逻辑
        detailData.sort((a, b) => Number(b.duration) - Number(a.duration));

        // 限制只显示前 10 个数据
        if (detailData.length > 10) {
            detailData = detailData.slice(0, 10);
        }

        // 销毁现有图表
        if (tagsBarChart) {
            tagsBarChart.destroy();
            tagsBarChart = null;
        }

        const options = {
            series: [
                {
                    name: "时长（小时）",
                    data: detailData.map((d) => Number(d.duration)),
                },
            ],
            chart: {
                type: "bar",
                height: "100%",
                animations: {
                    enabled: true,
                    easing: "easeinout",
                    speed: 800,
                },
                toolbar: {
                    show: false,
                },
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 4,
                },
            },
            title: {
                // text: `${selectedTag} 标签详情`,
                align: "center",
            },
            xaxis: {
                categories: detailData.map((d) => d.content),
                labels: {
                    show: false,
                },
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
            },
            grid: {
                show: false,
                xaxis: {
                    lines: {
                        show: false,
                    },
                },
                yaxis: {
                    lines: {
                        show: false,
                    },
                },
            },

            theme: { palette: "palette8" },
        };

        tagsBarChart = new ApexCharts(tagsBarChartElement, options);
        tagsBarChart.render();
    }

    // 修改 getBarChartOptions 函数，添加点击事件，右上
    function getBarChartOptions(tags: string[], durationHours: number[]) {
        // 创建标签和时长的配对数组并排序
        const sortedData = tags
            .map((tag, index) => ({
                tag,
                duration: durationHours[index]
            }))
            .sort((a, b) => b.duration - a.duration);

        // 从排序后的数据中分离出标签和时长
        const sortedTags = sortedData.map(item => item.tag);
        const sortedDurations = sortedData.map(item => item.duration);

        const options = {
            series: [
                {
                    name: "时长（小时）",
                    data: sortedDurations,  // 使用排序后的时长
                    color: "#3B82F6",
                },
            ],
            chart: {
                type: "bar",
                height: "100%", // 改为 100%
                width: "100%", // 添加宽度 100%
                animations: {
                    enabled: true,
                    easing: "easeinout",
                    speed: 800,
                    dynamicAnimation: { enabled: true, speed: 350 },
                },
                events: {
                    dataPointSelection: handleBarChartClick,
                },
                toolbar: {
                    show: false,
                },
            },
            plotOptions: { bar: { borderRadius: 4, horizontal: true } },
            dataLabels: { enabled: false },
            xaxis: {
                categories: sortedTags,  // 使用排序后的标签
                labels: {
                    show: false,
                },
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
            },
            // yaxis: { title: { text: '小时' } },
            title: {
                //  text: "标签时长布（小时）",
                align: "center",
            },
            grid: {
                show: false,
                xaxis: {
                    lines: {
                        show: false,
                    },
                },
                yaxis: {
                    lines: {
                        show: false,
                    },
                },
            },

            theme: { palette: "palette8" },
        };
        return options;
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

        // 添加：如果还没有选中的标签，自动选择占比最大的标签
        if (!selectedTag && tags.length > 0) {
            const sortedTags = Object.entries(tagStats)
                .sort(([, a], [, b]) => b - a)
                .map(([tag]) => tag);
            selectedTag = sortedTags[0];
            // 确保在下一个事件循环中更新标签详情图表
            setTimeout(() => {
                updateTagsDetailChart();
            }, 0);
        }

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
        if (tagsBarChart) {
            tagsBarChart.destroy();
            tagsBarChart = null;
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

<div class="flex flex-col h-full">
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
        <!-- 图表容器 -->
        <div class="flex-1 flex flex-col">
            <!-- 上部分图表 占 1/3 高度 -->
            <div class="flex flex-row w-full flex-none h-2/4">
                <div class="w-1/3 flex items-center justify-center">
                    <!-- 123 -->
                    <div bind:this={pieChartElement} class="w-full h-full"></div>
                </div>
                <div class="w-2/3 flex items-center justify-center">
                    <!-- 456 -->
                    <div bind:this={barChartElement} class="w-full"></div>
                </div>
            </div>

            <!-- 下部分标签详情图表 占 2/3 高度 -->
            <div class="w-full flex-1">
                <div bind:this={tagsBarChartElement} class="w-full"></div>
            </div>
        </div>
    {:else}
        <h2 class="text-2xl font-semibold mb-4">统计信息</h2>
        <!-- 空状态显示 -->
        <div class="flex flex-col items-center justify-center p-8 text-gray-500 bg-gray-50 rounded-lg">
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
