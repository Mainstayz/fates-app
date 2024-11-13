<script lang="ts">
    import { onMount } from "svelte";
    import { Timeline, DataSet } from "vis-timeline/standalone";
    import "vis-timeline/styles/vis-timeline-graph2d.css";

    let container: HTMLElement;

    onMount(() => {
        // 创建示例数据
        const items = new DataSet([
            { id: 1, content: "事件 1", start: "2024-03-01" },
            { id: 2, content: "事件 2", start: "2024-03-03" },
            { id: 3, content: "事件 3", start: "2024-03-05", end: "2024-03-08" },
        ]);

        // 配置选项
        const options = {
            locale: "zh_CN",
            height: "400px",
            editable: true,
            // zoomable: false,
            zoomMin: 1000 * 60 * 60 * 1,
            zoomMax: 1000 * 60 * 60 * 24 * 1.5,
            start: new Date(Date.now() - (12 + 6) * 60 * 60 * 1000),
            end: new Date(Date.now() + (12 + 6) * 60 * 60 * 1000),
            format: {
                minorLabels: {
                    minute: "HH:mm",
                    hour: "HH",
                },
                majorLabels: {
                    hour: "MM 月 DD 日",
                    weekday: "YYYY",
                    day: "YYYY",
                    week: "YYYY",
                    month: "YYYY",
                    year: "",
                },
            },
        };

        // 初始化时间线
        new Timeline(container, items, options);
    });
</script>

<div bind:this={container}></div>

<style>
    /* https://visjs.github.io/vis-timeline/examples/timeline/styling/customCss.html */
    /* https://github.com/A-Safdar/socs-theme-playground/blob/106a8b4af3b9411d3aabdc7246ec617ca4ff64df/src/SchoolsSports.Theme/wwwroot/themes/schools-sports/plugins/global/plugins.bundle.css#L736 */
    div {
        width: 100%;
        height: 400px;
        margin: 20px 0;
    }

    :root {
        --bs-border-color: #f1f1f4;
        --bs-primary: #1b84ff;
        --bs-secondary: #f1f1f4;
        --bs-success: #17c653;
        --bs-info: #7239ea;
        --bs-warning: #f6c000;
        --bs-danger: #f8285a;
        --bs-border-dashed-color: #dbdfe9;
        --bs-gray-100: #f9f9f9;
        --bs-gray-200: #f1f1f4;
        --bs-gray-300: #dbdfe9;
        --bs-gray-400: #c4cada;
        --bs-gray-500: #99a1b7;
        --bs-gray-600: #78829d;
        --bs-gray-700: #4b5675;
        --bs-gray-800: #252f4a;
        --bs-gray-900: #071437;
        --bs-warning-light: #fff8dd;
    }

    :global(.vis-timeline) {
        border: 1px solid var(--bs-border-color) !important;
        border-radius: 0.475rem !important;
    }

    :global(.vis-timeline .vis-labelset .vis-label) {
        display: flex;
        align-items: center;
        padding-left: 1rem;
        padding-right: 1rem;
        border-bottom: none;
        font-size: 1.25rem;
        font-weight: 500;
        color: var(--bs-gray-900);
    }

    :global(.vis-timeline .vis-foreground .vis-group) {
        border-bottom: none;
    }

    :global(.vis-timeline .vis-item) {
        position: absolute;
        color: var(--bs-gray-700);
        border-color: var(--bs-primary);
        border-width: 1px;
        background-color: var(--bs-gray-100);
        border-radius: 0.475rem !important;
    }
    :global(.vis-timeline .vis-item.vis-selected) {
        background-color: var(--bs-warning-light);
        color: var(--bs-gray-700);
        border-color: var(--bs-warning);
    }
    :global(.vis-timeline .vis-item .vis-item-content) {
        padding: 0.75rem 1rem;
        width: 100%;
        transform: none !important;
    }

    :global(.vis-timeline .vis-time-axis) {
        font-size: 0.95rem;
        text-transform: uppercase;
        font-weight: 500;
    }

    :global(.vis-timeline .vis-time-axis .vis-text) {
        color: var(--bs-gray-400);
    }

    :global(.vis-timeline .vis-time-axis .vis-grid.vis-minor) {
        border-left-color: var(--bs-border-dashed-color) !important;
    }

    :global(.vis-timeline .vis-time-axis .vis-grid.vis-vertical) {
        border-left-style: dashed !important;
    }

    :global(.vis-timeline .vis-panel .vis-shadow) {
        box-shadow: none !important;
    }

    :global(
            .vis-timeline .vis-panel.vis-bottom,
            .vis-timeline .vis-panel.vis-center,
            .vis-timeline .vis-panel.vis-left,
            .vis-timeline .vis-panel.vis-right,
            .vis-timeline .vis-panel.vis-top
        ) {
        border-color: var(--bs-border-color) !important;
    }

    :global(.vis-timeline .vis-current-time) {
        background-color: var(--bs-success);
        width: 1px;
    }

    /* :global(
            .vis-panel.vis-center,
            .vis-panel.vis-left,
            .vis-panel.vis-right,
            .vis-panel.vis-top,
            .vis-panel.vis-bottom
        ) {
        border: 0px solid;
    } */

    /* 主要刻度文字（日期） */
    /* :global(.vis-time-axis .vis-text.vis-major) {
        font-weight: bold;
    } */

    /* 次要刻度（小时、分钟） */
    /* :global(.vis-time-axis .vis-grid.vis-minor) {
        border-color: transparent;
    } */

    /* 主要刻度（日期） */
    /* :global(.vis-time-axis .vis-grid.vis-major) {
        border-color: orange;
    } */

    :global(.vis-time-axis .vis-grid.vis-today) {
        background: #f5f5f5;
    }
</style>
