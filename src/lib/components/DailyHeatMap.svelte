<script lang="ts">
    import { onMount } from "svelte";
    // @ts-ignore
    import CalHeatmap from "cal-heatmap";
    // @ts-ignore
    import Tooltip from "cal-heatmap/plugins/Tooltip";
    // @ts-ignore
    import LegendLite from "cal-heatmap/plugins/LegendLite";
    // @ts-ignore
    import CalendarLabel from "cal-heatmap/plugins/CalendarLabel";
    import dayjs from "dayjs";

    // 定义数据源的类型
    interface DataPoint {
        date: Date | string;
        value: number;
    }

    // 接收外部传入的数据
    let { data }: { data: DataPoint[] } = $props();

    let cal: CalHeatmap;

    onMount(() => {
        cal = new CalHeatmap();
        cal.paint(
            {
                data: {
                    source: data,
                    x: "date",
                    y: (d: DataPoint) => d.value,
                },
                date: { start: new Date(new Date().getFullYear(), 0, 1) },
                range: 12,
                scale: {
                    color: {
                        type: "threshold",
                        range: ["#14432a", "#166b34", "#37a446", "#4dd05a"],
                        domain: [1, 3, 5],
                    },
                },
                domain: {
                    type: "month",
                    gutter: 4,
                    label: { text: "MMM", textAlign: "start", position: "top" },
                },
                subDomain: { type: "ghDay", radius: 2, width: 11, height: 11, gutter: 4 },
                itemSelector: "#ex-ghDay",
            },
            [
                [
                    Tooltip,
                    {
                        text: (date: Date, value: number) => {
                            const formattedDate = new Date(date).toLocaleDateString("zh-CN", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            });
                            return `${value || "无"} 贡献于 ${formattedDate}`;
                        },
                    },
                ],
                [
                    LegendLite,
                    {
                        includeBlank: true,
                        itemSelector: "#ex-ghDay-legend",
                        radius: 2,
                        width: 11,
                        height: 11,
                        gutter: 4,
                    },
                ],
                [
                    CalendarLabel,
                    {
                        width: 30,
                        textAlign: "start",
                        text: () => ["", "一", "", "三", "", "五", ""].map(String),
                        padding: [25, 0, 0, 0],
                    },
                ],
            ]
        );
    });
</script>

<div class="heatmap-container">
    <div id="ex-ghDay"></div>
    <div class="controls">
        <div class="navigation">
            <button on:click={() => cal.previous()}>← Previous</button>
            <button on:click={() => cal.next()}>Next →</button>
        </div>
        <div class="legend">
            <span>Less</span>
            <div id="ex-ghDay-legend"></div>
            <span>More</span>
        </div>
    </div>
</div>

<style>
    .heatmap-container {
        background: #22272d;
        color: #adbac7;
        border-radius: 3px;
        padding: 1rem;
        overflow: hidden;
    }

    .controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
    }

    button {
        background: transparent;
        border: 1px solid #adbac7;
        color: #adbac7;
        padding: 0.25rem 0.5rem;
        border-radius: 3px;
        cursor: pointer;
        margin-right: 0.5rem;
    }

    .legend {
        display: flex;
        align-items: center;
        font-size: 12px;
    }

    .legend span {
        color: #768390;
        margin: 0 0.5rem;
    }
</style>
