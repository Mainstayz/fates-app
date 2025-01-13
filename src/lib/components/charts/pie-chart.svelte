<script lang="ts">
    import { onMount } from "svelte";
    import * as echarts from "echarts";
    import type { ECharts } from "echarts";

    interface ChartData {
        tags: string[];
        durations: number[];
        totalDuration: number;
    }

    export let data: ChartData;
    export let onTagSelect: (tag: string) => void;

    let chartElement: HTMLElement;
    let chart: ECharts;

    $: if (chart && data) {
        const option = {
            tooltip: {
                trigger: "item",
                formatter: (params: any) => {
                    const minutes = +params.value.toFixed(1);
                    const hours = +(minutes / 60).toFixed(1);
                    return `${params.name}<br/>
                            ${hours}h (${params.percent}%)`;
                },
            },
            legend: {
                orient: "vertical",
                right: "5%",
                top: "center",
                type: "scroll",
            },
            series: [
                {
                    type: "pie",
                    radius: ["40%", "70%"], // 设置成环形图
                    center: ["40%", "50%"], // 调整位置以适应图例
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 4,
                        borderColor: "#fff",
                        borderWidth: 2,
                    },
                    label: {
                        show: false,
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 14,
                            fontWeight: "bold",
                        },
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: "rgba(0, 0, 0, 0.5)",
                        },
                    },
                    data: data.tags.map((tag, index) => ({
                        value: +(data.durations[index] / (1000 * 60)).toFixed(1), // 转换为分钟
                        name: tag,
                    })),
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

<div bind:this={chartElement} style="width: 100%; height: 100%"></div>
