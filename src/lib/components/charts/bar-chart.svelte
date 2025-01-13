<script lang="ts">
    import { onMount } from "svelte";
    import * as echarts from "echarts";
    import type { ECharts } from "echarts";

    interface ChartData {
        tags: string[];
        durationHours: number[];
    }

    export let data: ChartData;
    export let onTagSelect: (tag: string) => void;

    let chartElement: HTMLElement;
    let chart: ECharts;

    $: if (chart && data) {
        const option = {
            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "shadow",
                },
                formatter: (params: any) => {
                    const data = params[0];
                    return `${data.name}<br/>${data.value}h`;
                },
            },
            grid: {
                left: "3%",
                right: "4%",
                bottom: "15%",
                containLabel: true,
            },
            xAxis: {
                type: "category",
                data: data.tags,
                axisLabel: {
                    interval: 0,
                    rotate: 45,
                },
            },
            yAxis: {
                type: "value",
                name: "时长 (小时)",
                nameLocation: "middle",
                nameGap: 40,
                axisLabel: {
                    formatter: "{value}h",
                },
            },
            series: [
                {
                    type: "bar",
                    data: data.durationHours.map((value) => ({
                        value,
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
                                { offset: 0, color: "#83bff6" },
                                { offset: 0.5, color: "#188df0" },
                                { offset: 1, color: "#188df0" },
                            ]),
                        },
                    })),
                    emphasis: {
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
                                { offset: 0, color: "#66a6e5" },
                                { offset: 0.7, color: "#1677d9" },
                                { offset: 1, color: "#1677d9" },
                            ]),
                        },
                    },
                },
            ],
        };
        chart.setOption(option);
    }

    onMount(() => {
        chart = echarts.init(chartElement);

        chart.on("click", (params) => {
            if (params.name) {
                onTagSelect(params.name);
            }
        });

        const resizeHandler = () => {
            chart?.resize();
        };
        window.addEventListener("resize", resizeHandler);

        return () => {
            chart?.dispose();
            window.removeEventListener("resize", resizeHandler);
        };
    });
</script>

<div bind:this={chartElement}></div>
