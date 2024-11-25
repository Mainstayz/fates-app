<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import ApexCharts from "apexcharts";
    import type { TimelineItem } from "$lib/types";

    export let data: { tags: string[], durations: number[], totalDuration: number };
    export let onTagSelect: (tag: string) => void;

    let chartElement: HTMLElement;
    let chart: ApexCharts | null = null;

    function getChartOptions() {
        return {
            series: data.durations.map(d => +((d / data.totalDuration) * 100).toFixed(1)),
            chart: {
                type: "donut",
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
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: "70%",
                    },
                },
            },
            labels: data.tags,
            legend: { position: "bottom" },
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

<div bind:this={chartElement} class="w-full h-full" ></div>
