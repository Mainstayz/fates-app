<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { t } from "svelte-i18n";
    import ApexCharts from "apexcharts";

    export let data: Array<{ content: string; duration: number }>;
    export let selectedTag: string;

    let chartElement: HTMLElement;
    let chart: ApexCharts | null = null;

    function getChartOptions() {
        return {
            series: [
                {
                    name: $t("app.statistics.durationHours"),
                    data: data.map((d) => d.duration),
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
                text: $t("app.statistics.tagDetailChart.topTen", {
                    values: { tag: selectedTag },
                }),
                align: "center",
            },
            xaxis: {
                categories: data.map((d) => d.content),
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
            yaxis: {
                labels: {
                    show: true,
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

    function updateChart() {
        if (chart && data) {
            chart.updateOptions(getChartOptions());
        }
    }

    $: {
        data;
        selectedTag;
        updateChart();
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
