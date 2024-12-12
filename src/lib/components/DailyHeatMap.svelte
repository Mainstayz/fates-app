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
    import "cal-heatmap/cal-heatmap.css";

    // 定义数据源的类型
    interface DataPoint {
        date: Date | string;
        value: number;
    }

    // 接收外部传入的数据
    let { data }: { data: DataPoint[] } = $props();

    let cal: CalHeatmap;

    type SubDomain = {
        type: string;
        gutter: number;
        width: number;
        height: number;
        radius: number;
        label: string | null | ((timestamp: number, value: number, element: SVGElement) => string);
        color?: string | ((timestamp: number, value: number, backgroundColor: string) => string);
    };

    type TemplateResult = {
        name: string;
        allowedDomainType: CalHeatmap.DomainType[];
        rowsCount: (ts: number) => number;
        columnsCount: (ts: number) => number;
        mapping: (startTimestamp: number, endTimestamp: number) => SubDomain[];
        extractUnit: (ts: number) => number;
    };

    // https://github.com/yqchilde/yqchilde.github.io/blob/8b4edcc7fc222f4e0cb9838625e7506b36e15b69/.vitepress/theme/components/heatmap.vue#L54
    const yyTemplate = (DateHelper: any): TemplateResult => {
        const ALLOWED_DOMAIN_TYPE: CalHeatmap.DomainType[] = ["month"];
        return {
            name: "yyDay",
            allowedDomainType: ALLOWED_DOMAIN_TYPE,
            rowsCount: (ts: number) => {
                return 7;
            },
            columnsCount: (ts) => {
                return DateHelper.getWeeksCountInMonth(ts);
            },
            mapping: (startTimestamp: number, endTimestamp: number) => {
                const clampStart = DateHelper.getFirstWeekOfMonth(startTimestamp);
                const tomorrowStart = DateHelper.date().add(1, "day").startOf("day").valueOf();
                let clampEnd;
                if (endTimestamp > tomorrowStart) {
                    clampEnd = DateHelper.date(tomorrowStart);
                } else {
                    clampEnd = DateHelper.getFirstWeekOfMonth(endTimestamp);
                }
                let x = -1;
                const pivotDay = clampStart.weekday();
                return DateHelper.intervals("day", clampStart, clampEnd).map((ts: number) => {
                    const weekday = DateHelper.date(ts).weekday();
                    if (weekday === pivotDay) {
                        x += 1;
                    }
                    return {
                        t: ts,
                        x,
                        y: weekday,
                    };
                });
            },
            extractUnit: (ts: number) => {
                return DateHelper.date(ts).startOf("day").valueOf();
            },
        };
    };

    onMount(() => {
        cal = new CalHeatmap();
        cal.addTemplates(yyTemplate);
        cal.paint(
            {
                theme: "light",
                data: {
                    source: data,
                    x: "date",
                    y: (d: DataPoint) => d.value,
                    groupY: "max",
                },
                date: {
                    start: dayjs().startOf("year").valueOf(),
                    min: dayjs().startOf("year").valueOf(),
                    max: dayjs(),
                },
                range: 13,
                scale: {
                    color: {
                        type: "threshold",
                        range: ["#9be9a8", "#40c463", "#30a14e", "#216e39"],
                        domain: [2, 3, 5],
                    },
                },
                domain: {
                    type: "month",
                    // dynamicDimension: false,
                    gutter: 4, // 每个域之间的空间，以像素为单位
                    label: { text: "M 月", textAlign: "middle", position: "top" },
                },
                subDomain: {
                    type: "yyDay", // 显示域类型中的所有天，但域的开始和结束四舍五入到该月的第一周和结束周，以便每列具有相同的天数。
                    radius: 2,
                    width: 15,
                    height: 15,
                    gutter: 4,
                },
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
                        width: 15,
                        height: 15,
                        gutter: 4,
                    },
                ],
                [
                    CalendarLabel,
                    {
                        width: 25,
                        textAlign: "start",
                        padding: [25, 0, 0, 0],
                        text: function () {
                            return ["", "一", "", "三", "", "五", ""];
                        },
                    },
                ],
            ]
        );
    });
</script>

<div class="bg-background">
    <div class="w-full" id="ex-ghDay"></div>
    <div class="flex justify-end">
        <div class="flex items-center text-sm text-muted-foreground mt-2 mr-8 gap-2">
            <span class="mx-2">Less</span>
            <div id="ex-ghDay-legend"></div>
            <span class="mx-2">More</span>
        </div>
    </div>
</div>
