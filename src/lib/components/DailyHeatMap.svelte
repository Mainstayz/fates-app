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
    import localeData from "dayjs/plugin/localeData";
    import "cal-heatmap/cal-heatmap.css";

    dayjs.extend(localeData);

    import { t, locale } from "svelte-i18n";

    // 定义数据源的类型
    interface DataPoint {
        date: Date | string;
        value: number;
    }

    // 接收外部传入的数据
    let { data }: { data: DataPoint[] } = $props();

    let cal: CalHeatmap;

    let monthLabel = $derived($t("app.timeline.month"));
    let weekdaysMon = $derived($t("app.timeline.weekdays.mon"));
    let weekdaysWed = $derived($t("app.timeline.weekdays.wed"));
    let weekdaysFri = $derived($t("app.timeline.weekdays.fri"));

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

    // 添加重绘方法
    export function redraw(newData: DataPoint[]) {
        if (cal) {
            cal.fill(newData);
        }
    }

    function redrawCal(locale: string = "en") {
        if (cal) {
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
                        locale: locale,
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
                        label: { text: monthLabel, textAlign: "middle", position: "top" },
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
                                return `${value || $t("app.timeline.noValue")} ${$t("app.timeline.taskCompletionAt")} ${dayjs(date).format("YYYY-MM-DD")}`;
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
                            text: () => ["", weekdaysMon, "", weekdaysWed, "", weekdaysFri, ""],
                        },
                    ],
                ]
            );
        }
    }

    locale.subscribe((l: string | null | undefined) => {
        if (cal && l) {
            cal.paint({
                date: {
                    locale: l,
                },
            });
        }
    });

    onMount(() => {
        cal = new CalHeatmap();
        redrawCal();
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
