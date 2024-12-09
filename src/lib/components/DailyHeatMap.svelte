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

    const yyTemplate = (DateHelper: any): TemplateResult => {
        const ALLOWED_DOMAIN_TYPE: CalHeatmap.DomainType[] = ["month"];
        return {
            name: "yyDay",
            allowedDomainType: ALLOWED_DOMAIN_TYPE,
            rowsCount: () => 7, // 固定 7 行 (对应周一到周日)
            columnsCount: (ts) => {
                // 非当前月显示完整周数
                if (DateHelper.date(ts).startOf("month").valueOf() !== DateHelper.date().startOf("month").valueOf()) {
                    return DateHelper.getWeeksCountInMonth(ts);
                } else {
                    // 当前月只显示到今天所在的周
                    let firstBlockDate = DateHelper.getFirstWeekOfMonth(ts);
                    // 计算从今天到第一个块的时间间隔
                    let interval = DateHelper.intervals("day", firstBlockDate, DateHelper.date()).length;
                    // 计算需要规划几列
                    let intervalCol = Math.ceil((interval + 1) / 7);
                    return intervalCol;
                }
            },
            mapping: (startTimestamp: number, endTimestamp: number) => {
                // 将日期映射到网格坐标系统
                // x: 表示周数
                // y: 表示星期几 (0-6)
                // t: 时间戳
                const clampStart = DateHelper.getFirstWeekOfMonth(startTimestamp);
                const clampEnd = dayjs()
                    .startOf("day")
                    .add(8 - dayjs().day(), "day");

                let x = -1;
                const pivotDay = clampStart.day();
                return DateHelper.intervals("day", clampStart, clampEnd).map((ts: number) => {
                    const weekday = DateHelper.date(ts).day();
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
                // 将时间戳标准化到每天的开始时间
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
                    start: dayjs().subtract(12, "month").valueOf(),
                    min: dayjs().startOf("year").valueOf(),
                    max: dayjs(),
                    locale: "zh",
                    timezone: "Asia/Shanghai",
                },
                range: 13,
                scale: {
                    color: {
                        type: "threshold",
                        range: ["#14432a", "#166b34", "#37a446", "#4dd05a"],
                        domain: [1, 2, 3, 4],
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
