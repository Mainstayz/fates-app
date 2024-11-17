<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import ApexCharts from 'apexcharts';
    import type { TimelineItem } from '$lib/types';

    export let items: TimelineItem[] = [];

    let pieChartElement: HTMLElement;
    let barChartElement: HTMLElement;
    let pieChart: ApexCharts;
    let barChart: ApexCharts;

    function calculateTagStats(items: TimelineItem[]) {
        const tagDurations: { [key: string]: number } = {};

        items.forEach(item => {
            if (!item.start || !item.end) return;

            const duration = new Date(item.end).getTime() - new Date(item.start).getTime();
            const tags = item.tags && item.tags.length > 0 && item.tags[0] !== ''
                ? item.tags
                : ['其他'];

            tags.forEach(tag => {
                tagDurations[tag] = (tagDurations[tag] || 0) + duration;
            });
        });

        return tagDurations;
    }

    function createCharts() {
        const tagStats = calculateTagStats(items);
        const tags = Object.keys(tagStats);
        const durations = Object.values(tagStats);
        const totalDuration = durations.reduce((a, b) => a + b, 0);
        const durationHours = durations.map(d => +(d / (1000 * 60 * 60)).toFixed(2)); // 转换为小时

        // 饼图配置
        const pieChartOptions = {
            series: durations.map(d => +(d / totalDuration * 100).toFixed(1)),
            chart: {
                type: 'pie',
                height: 350
            },
            labels: tags,
            title: {
                text: '标签占比分布 (%)',
                align: 'center'
            },
            legend: {
                position: 'bottom'
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 300
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }],
            theme: {
                palette: 'palette8' // 使用内置配色方案
            }
        };

        // 柱状图配置
        const barChartOptions = {
            series: [{
                name: '时长（小时）',
                data: durationHours
            }],
            chart: {
                type: 'bar',
                height: 350
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    horizontal: false,
                }
            },
            dataLabels: {
                enabled: false
            },
            xaxis: {
                categories: tags,
            },
            yaxis: {
                title: {
                    text: '小时'
                }
            },
            title: {
                text: '标签时长分布（小时）',
                align: 'center'
            },
            theme: {
                palette: 'palette8'
            }
        };

        // 销毁现有图表
        if (pieChart) pieChart.destroy();
        if (barChart) barChart.destroy();

        // 创建新图表
        pieChart = new ApexCharts(pieChartElement, pieChartOptions);
        barChart = new ApexCharts(barChartElement, barChartOptions);

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

    // 监听 items 变化，重新渲染图表
    $: if (items) {
        if (pieChartElement && barChartElement) {
            createCharts();
        }
    }
</script>

<div class="flex flex-col md:flex-row gap-4 w-full">
    <div class="w-full md:w-1/2">
        <div bind:this={pieChartElement}></div>
    </div>
    <div class="w-full md:w-1/2">
        <div bind:this={barChartElement}></div>
    </div>
</div>
