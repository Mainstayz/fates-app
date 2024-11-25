<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import ApexCharts from "apexcharts";

    export let data: Array<{ content: string; duration: number }>;
    export let selectedTag: string;

    let chartElement: HTMLElement;
    let chart: ApexCharts | null = null;

    function getChartOptions() {
        return {
            series: [{
                name: "时长（小时）",
                data: data.map(d => d.duration),
            }],
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
                text: `${selectedTag} 前 10 条`,
                align: "center",
            },
            xaxis: {
                categories: data.map(d => d.content),
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
    }

    $: if (chart && data) {
        chart.updateOptions(getChartOptions());
    }

    onMount(() => {
        if (chartElement) {
            chart = new ApexCharts(chartElement, getChartOptions());
            chart.render();
        }
    });

    onDestroy(() => {
        if (chart) {
            chart.destroy();
            chart = null;
        }
    });
</script>

<div bind:this={chartElement} class="w-full h-full"></div>
