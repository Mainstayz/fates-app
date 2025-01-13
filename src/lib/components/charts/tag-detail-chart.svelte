<script lang="ts">
    import { onMount } from "svelte";
    import * as echarts from "echarts";
    import type { ECharts } from "echarts";
    import { t } from "svelte-i18n";

    interface DetailData {
        content: string;
        duration: number;
    }

    export let data: DetailData[];
    export let selectedTag: string;

    let chartElement: HTMLElement;
    let chart: ECharts;

    $: TopTtitle = $t("app.statistics.tagDetailChartTitle");

    $: if (chart && data) {
        const option = {
            title: {
                text: `${selectedTag} ${TopTtitle}`,
                left: "center",
                top: 10,
            },
            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "shadow",
                },
                formatter: (params: any) => {
                    const data = params[0];
                    return `${data.name}<br/>
                            ${data.value}h`;
                },
            },
            grid: {
                left: "3%",
                right: "4%",
                bottom: "3%",
                top: "15%",
                containLabel: true,
            },
            xAxis: {
                type: "value",
                nameLocation: "middle",
                nameGap: 30,
                axisLabel: {
                    formatter: "{value}h",
                },
                splitLine: {
                    show: false,
                },
            },
            yAxis: {
                type: "category",
                data: data.map((item) => item.content),
                axisLabel: {
                    width: 200,
                    overflow: "break",
                    interval: 0,
                },
            },
            series: [
                {
                    type: "bar",
                    data: data.map((item) => ({
                        value: item.duration,
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                                { offset: 0, color: "#83bff6" },
                                { offset: 0.5, color: "#188df0" },
                                { offset: 1, color: "#188df0" },
                            ]),
                        },
                    })),
                    emphasis: {
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
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

<div bind:this={chartElement} style="width: 100%; height: 100%"></div>
