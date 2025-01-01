import type { TimelineItem } from "$lib/types";

export const UNCLASSIFIED_TAG = "未分类";
export const OTHER_TAG = "其他";
export const MAX_TAGS = 10;

export type TimeRange = "all" | "year" | "month" | "week";

export function filterItemsByRange(items: TimelineItem[], range: TimeRange): TimelineItem[] {
    const now = new Date();
    const startDate = new Date();
    switch (range) {
        case "week":
            startDate.setDate(now.getDate() - 7);
            break;
        case "month":
            startDate.setMonth(now.getMonth() - 1);
            break;
        case "year":
            startDate.setFullYear(now.getFullYear(), 0, 1);
            break;
        default:
            return items;
    }
    return items.filter((item) => {
        const itemDate = new Date(item.start);
        return itemDate >= startDate && itemDate <= now;
    });
}

export function calculateTagStats(items: TimelineItem[], selectedRange: TimeRange) {

    const tagDurations: { [key: string]: number } = {};
    const filteredItems = filterItemsByRange(items, selectedRange);

    filteredItems.forEach((item) => {
        if (!item.start || !item.end) return;

        const duration = new Date(item.end).getTime() - new Date(item.start).getTime();
        const tags = !item.tags || item.tags.length === 0 ? [""] : item.tags;

        tags.forEach((tag) => {
            const tagName = tag.trim() || UNCLASSIFIED_TAG;
            tagDurations[tagName] = (tagDurations[tagName] || 0) + duration;
        });
    });


    const sortedEntries = Object.entries(tagDurations).sort(([, a], [, b]) => b - a);
    if (sortedEntries.length > MAX_TAGS) {
        const top9Entries = sortedEntries.slice(0, 9);
        const othersDuration = sortedEntries.slice(9)
            .reduce((sum, [, duration]) => sum + duration, 0);

        return Object.fromEntries([...top9Entries, [OTHER_TAG, othersDuration]]);
    }

    return tagDurations;
}
