<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import ApexCharts from 'apexcharts';
    import type { TimelineItem } from '$lib/types';
    import * as Select from "$lib/components/ui/select";

    // 类型定义
    type TimeRange = 'all' | 'year' | 'month' | 'week';

    // Props
    export let items: TimelineItem[] = [];

    // DOM 引用
    let pieChartElement: HTMLElement;
    let barChartElement: HTMLElement;

    // Chart 实例
    let pieChart: ApexCharts;
    let barChart: ApexCharts;

    // 时间范围状态和选项
    let selectedRange: TimeRange = 'all';
    const timeRanges = [
        { value: 'all', label: '所有时间' },
        { value: 'year', label: '今年来' },
        { value: 'month', label: '最近一个月' },
        { value: 'week', label: '最近一周' }
    ] as const;

    // 根据选择的时间范围过滤数据
    function filterItemsByRange(items: TimelineItem[], range: string): TimelineItem[] {
        const now = new Date();
        const startDate = new Date();

        switch (range) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear(), 0, 1); // 今年1月1日
                break;
            default:
                return items; // 'all' 返回所有数据
        }

        return items.filter(item => {
            const itemDate = new Date(item.start);
            return itemDate >= startDate && itemDate <= now;
        });
    }

    // 优化 calculateTagStats 函数，添加类型注解
    function calculateTagStats(items: TimelineItem[]): { [key: string]: number } {
        const tagDurations: { [key: string]: number } = {};
        const filteredItems = filterItemsByRange(items, selectedRange);

        filteredItems.forEach(item => {
            if (!item.start || !item.end) return;

            const duration = new Date(item.end).getTime() - new Date(item.start).getTime();
            // 简化三元表达式
            const tags = item.tags?.length ? item.tags : ['其他'];

            tags.forEach(tag => {
                tagDurations[tag] = (tagDurations[tag] || 0) + duration;
            });
        });

        return tagDurations;
    }

    // 将图表配置抽离为单独的函数
    function getPieChartOptions(tags: string[], durations: number[], totalDuration: number) {
        return {
            series: durations.map(d => +(d / totalDuration * 100).toFixed(1)),
            chart: {
                type: 'donut',
                height: 350,
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: { enabled: true, delay: 150 },
                    dynamicAnimation: { enabled: true, speed: 350 }
                }
            },
            labels: tags,
            title: { text: '标签占比分布 (%)', align: 'center' },
            legend: { position: 'bottom' },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: { width: 300 },
                    legend: { position: 'bottom' }
                }
            }],
            theme: { palette: 'palette8' }
        };
    }

    function getBarChartOptions(tags: string[], durationHours: number[]) {
        console.log("getBarChartOptions", tags, durationHours);

        // 创建包含标签和时长的对象数组，以便排序
        const combined = tags.map((tag, index) => ({
            tag,
            duration: durationHours[index]
        }));

        // 按时长降序排序
        combined.sort((a, b) => b.duration - a.duration);

        // 分离排序后的标签和时长
        const sortedTags = combined.map(item => item.tag);
        const sortedHours = combined.map(item => item.duration);

        return {
            series: [{
                name: '时长（小时）',
                data: sortedHours,
                color: '#3B82F6' // 设置为蓝色
            }],
            chart: {
                type: 'bar',
                height: 350,
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    dynamicAnimation: { enabled: true, speed: 350 }
                }
            },
            plotOptions: { bar: { borderRadius: 4, horizontal: true } },
            dataLabels: { enabled: false },
            xaxis: { categories: sortedTags },
            // yaxis: { title: { text: '小时' } },
            title: { text: '标签时长分布（小时）', align: 'center' },
            theme: { palette: 'palette8' }
        };
    }

    function createCharts() {
        console.log("Creating charts ...");
        const tagStats = calculateTagStats(items);
        const tags = Object.keys(tagStats);
        const durations = Object.values(tagStats);
        const totalDuration = durations.reduce((a, b) => a + b, 0);
        const durationHours = durations.map(d => +(d / (1000 * 60 * 60)).toFixed(2));

        // 销毁现有图表
        if (pieChart) pieChart.destroy();
        if (barChart) barChart.destroy();

        // 创建新图表
        pieChart = new ApexCharts(pieChartElement, getPieChartOptions(tags, durations, totalDuration));
        barChart = new ApexCharts(barChartElement, getBarChartOptions(tags, durationHours));

        pieChart.render();
        barChart.render();
    }

    onMount(() => {
        createCharts();
    });

    onDestroy(() => {
        if (pieChart) pieChart.destroy();
        if (barChart) barChart.destroy();
    });

    // 监听 items 和 selectedRange 变化，重新渲染图表
    $: if (items && pieChartElement && barChartElement) {
        console.log("Items changed, re-rendering charts ...");
        createCharts();
    }

    // 处理时间范围变化
    function handleValueSelect(event: CustomEvent<TimeRange>) {
        selectedRange = event.detail;
    }

    // Add update callback
    export function updateCharts(newItems: TimelineItem[]) {
        items = newItems;
        console.log('updateCharts', items);
        if (pieChartElement && barChartElement) {
            createCharts();
        }
    }
</script>

<div class="space-y-4">
    <!-- 时间范围选择器 -->
    <div class="w-[200px]">
        <Select.Root  type="single" bind:value={selectedRange}>
            <Select.Trigger class="w-full">
                <span>{timeRanges.find(r => r.value === selectedRange)?.label || '选择时间范围'}</span>
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
    <div class="flex flex-col md:flex-row gap-4 w-full">
        <div class="w-full md:w-1/2">
            <div bind:this={pieChartElement}></div>
        </div>
        <div class="w-full md:w-1/2">
            <div bind:this={barChartElement}></div>
        </div>
    </div>
</div>
