<script lang="ts">
    import { onMount } from "svelte";
    import dayjs from "dayjs";
    import localeData from "dayjs/plugin/localeData";
    import * as echarts from "echarts";
    import type { EChartsOption } from "echarts";
    import { t, locale } from "svelte-i18n";
    import localizedFormat from "dayjs/plugin/localizedFormat";
    import "dayjs/locale/zh";
    import "dayjs/locale/en";
    import { appConfig } from "$src/app-config";
    import type { AppConfig } from "$src/app-config";

    dayjs.extend(localeData);
    dayjs.extend(localizedFormat);

    // 定义数据源的类型
    interface DataPoint {
        date: Date | string;
        value: number;
    }

    // 接收外部传入的数据
    let { data }: { data: DataPoint[] } = $props();

    let chartDom: HTMLDivElement;
    let myChart: echarts.ECharts;
    let isDarkMode = appConfig.getConfig().theme === "dark";

    function getVisualPieces() {
        // !!! Dark Mode
        if (isDarkMode) {
            return [
                { min: 5, max: 100, color: "#39d353" },
                { min: 3, max: 4, color: "#26a641" },
                { min: 2, max: 2, color: "#006d32" },
                { min: 1, max: 1, color: "#0e4429" },
                { min: 0, max: 0, color: "#161b22" },
            ];
        }
        return [
            { min: 5, max: 100, color: "#216e39" },
            { min: 3, max: 4, color: "#30a14e" },
            { min: 2, max: 2, color: "#40c463" },
            { min: 1, max: 1, color: "#9be9a8" },
            { min: 0, max: 0, color: "#ebedf0" },
        ];
    }

    function fillMissingDates(data: DataPoint[]): DataPoint[] {
        const dateFormat = "YYYY-MM-DD";
        const startDate = dayjs().startOf("year");
        const endDate = dayjs();
        const filledData: DataPoint[] = [];
        const dataMap = new Map(data.map((item) => [dayjs(item.date).format(dateFormat), item.value]));

        let currentDate = startDate;
        while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, "day")) {
            const dateStr = currentDate.format(dateFormat);
            filledData.push({
                date: dateStr,
                value: dataMap.has(dateStr) ? dataMap.get(dateStr)! : 0,
            });
            currentDate = currentDate.add(1, "day");
        }

        return filledData;
    }

    function formatData(data: DataPoint[]) {
        const filledData = fillMissingDates(data);
        console.log(`[DailyHeatMap] FilledData count: ${filledData.length}`);
        return filledData.map((item) => {
            return [item.date, item.value];
        });
    }

    function updateChart(locale: string = "en") {
        if (!myChart) return;

        console.log(`[DailyHeatMap] Locale: ${locale}`);
        const option: EChartsOption = {
            backgroundColor: isDarkMode ? "#1c1816" : "#fff",
            tooltip: {
                formatter: function (params: any) {
                    const value = params.value[1] || $t("app.timeline.noValue");
                    const dateStr = params.value[0];
                    const date = dayjs(dateStr).locale(locale).format("MMM DD");
                    return `${value} ${$t("app.timeline.taskCompletionAt")} ${date}`;
                },
            },
            visualMap: {
                show: true,
                min: 0,
                max: 5,
                orient: "horizontal",
                left: "right",
                bottom: "0%",
                text: ["More", "Less"],
                pieces: getVisualPieces(),
                dimension: 1,
                textStyle: {
                    // less more text color
                    // --muted-foreground
                    color: isDarkMode ? "#9e9793" : "#64748b",
                },
            },
            calendar: {
                top: 30,
                left: 30,
                right: 30,
                range: dayjs().format("YYYY"),
                itemStyle: {
                    // !!! Dark Mode
                    color: isDarkMode ? "#1c1816" : "#fff",
                    borderColor: isDarkMode ? "#1c1816" : "#fff",
                },
                splitLine: {
                    show: false,
                },
                yearLabel: { show: false },
                dayLabel: {
                    firstDay: 0,
                    nameMap: locale.toUpperCase(),
                    color: isDarkMode ? "#9e9793" : "#000",
                },
                monthLabel: {
                    nameMap: locale.toUpperCase(),
                    color: isDarkMode ? "#9e9793" : "#000",
                },
            },
            series: {
                type: "heatmap",
                coordinateSystem: "calendar",
                data: formatData(data),
                color: isDarkMode ? "#1c1816" : "#fff",
                itemStyle: {
                    borderWidth: 4,
                    borderColor: isDarkMode ? "#1c1816" : "#fff",
                    borderRadius: 4,
                },
                emphasis: {
                    disabled: true,
                },
            },
        };
        myChart.setOption(option, true);
    }

    // 添加重绘方法
    export function redraw(newData: DataPoint[]) {
        data = newData;
        updateChart($locale ?? "en");
    }

    locale.subscribe((l: string | null | undefined) => {
        if (myChart && l) {
            updateChart(l);
        }
    });

    onMount(() => {
        myChart = echarts.init(chartDom, isDarkMode ? "dark" : undefined);
        updateChart($locale ?? "en");

        // Add resize handler
        const handleResize = () => {
            myChart?.resize();
        };

        // Add theme change handler
        const unsubscribe = appConfig.subscribe((config: AppConfig) => {
            isDarkMode = config.theme === "dark";
            if (myChart) {
                myChart.dispose();
                myChart = echarts.init(chartDom, isDarkMode ? "dark" : undefined);
                updateChart($locale ?? "en");
            }
        });

        // Add resize event listener
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            unsubscribe();
            myChart?.dispose();
        };
    });
</script>

<div class="bg-background">
    <div class="w-full h-[200px]" bind:this={chartDom}></div>
</div>
