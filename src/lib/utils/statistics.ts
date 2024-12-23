import type { TimelineItem } from "$lib/types";


//TODO： 本地化
export const UNCLASSIFIED_TAG = "未分类";
export const OTHER_TAG = "其他";
export const MAX_TAGS = 10;

export type TimeRange = "all" | "year" | "month" | "week";

/**
 * 根据时间范围过滤时间项
 * @param items - 需要过滤的时间项数组
 * @param range - 时间范围选项:"week"(一周),"month"(一个月),"year"(今年),"all"(全部)
 * @returns 过滤后的时间项数组
 *
 * 该函数主要完成以下工作:
 * 1. 根据选定的时间范围计算起始日期
 * 2. 过滤出在起始日期和当前时间之间的时间项
 */
export function filterItemsByRange(items: TimelineItem[], range: TimeRange): TimelineItem[] {
    // 获取当前时间作为结束时间点
    const now = new Date();
    // 创建起始时间点
    const startDate = new Date();

    // 根据不同时间范围设置起始日期
    switch (range) {
        case "week":
            // 设置为 7 天前
            startDate.setDate(now.getDate() - 7);
            break;
        case "month":
            // 设置为 1 个月前
            startDate.setMonth(now.getMonth() - 1);
            break;
        case "year":
            // 设置为今年年初 (1 月 1 日)
            startDate.setFullYear(now.getFullYear(), 0, 1);
            break;
        default:
            // 如果是"all",返回所有时间项
            return items;
    }

    // 过滤时间项：只保留开始时间在起始日期和当前时间之间的项
    return items.filter((item) => {
        const itemDate = new Date(item.start);
        return itemDate >= startDate && itemDate <= now;
    });
}

/**
 * 计算标签统计数据
 * @param items - 时间项数组
 * @param selectedRange - 选定的时间范围
 * @returns 包含每个标签总时长的对象
 *
 * 该函数主要完成以下工作:
 * 1. 根据选定时间范围过滤时间项
 * 2. 计算每个标签的总时长
 * 3. 如果标签数量超过最大值(10个),则将多余的标签归类为"其他"
 */
export function calculateTagStats(items: TimelineItem[], selectedRange: TimeRange) {
    // 用于存储每个标签的总时长
    const tagDurations: { [key: string]: number } = {};
    // 根据选定范围过滤时间项
    const filteredItems = filterItemsByRange(items, selectedRange);

    // 遍历每个时间项计算标签时长
    filteredItems.forEach((item) => {
        // 跳过无效的时间项
        if (!item.start || !item.end) return;

        // 计算该时间项的持续时长 (毫秒)
        const duration = new Date(item.end).getTime() - new Date(item.start).getTime();
        // 处理无标签的情况，将空标签转换为空字符串数组
        const tags = !item.tags || item.tags.length === 0 ? [""] : item.tags;

        // 为每个标签累加时长
        tags.forEach((tag) => {
            // 处理空标签，将其归类为"未分类"
            const tagName = tag.trim() || UNCLASSIFIED_TAG;
            tagDurations[tagName] = (tagDurations[tagName] || 0) + duration;
        });
    });

    // 按时长降序排序标签
    const sortedEntries = Object.entries(tagDurations).sort(([, a], [, b]) => b - a);

    // 如果标签数量超过最大值
    if (sortedEntries.length > MAX_TAGS) {
        // 取前 9 个标签
        const top9Entries = sortedEntries.slice(0, 9);
        // 计算剩余标签的总时长
        const othersDuration = sortedEntries.slice(9)
            .reduce((sum, [, duration]) => sum + duration, 0);

        // 返回前 9 个标签加上"其他"标签的结果
        return Object.fromEntries([...top9Entries, [OTHER_TAG, othersDuration]]);
    }

    // 如果标签数量未超过最大值，直接返回原始结果
    return tagDurations;
}
