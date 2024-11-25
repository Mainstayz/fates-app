<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import ApexCharts from "apexcharts";

    export let data: { tags: string[], durationHours: number[] };
    export let onTagSelect: (tag: string) => void;

    let chartElement: HTMLElement;
    let chart: ApexCharts | null = null;

    function getChartOptions() {
        return {
            series: [{
                name: "时长（小时）",
                data: data.durationHours,
                color: "#3B82F6",
            }],
            chart: {
                type: "bar",
                height: "100%",
                width: "100%",
                animations: {
                    enabled: true,
                    easing: "easeinout",
                    speed: 800,
                },
                events: {
                    dataPointSelection: (event: any, chartContext: any, config: any) => {
                        const tagIndex = config.dataPointIndex;
                        if (tagIndex !== -1) {
                            onTagSelect(data.tags[tagIndex]);
                        }
                    },
                },
                toolbar: {
                    show: false,
                },
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    horizontal: true
                }
            },
            dataLabels: { enabled: false },
            xaxis: {
                categories: data.tags,
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

<div bind:this={chartElement} class="w-full h-full" />
