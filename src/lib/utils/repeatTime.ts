export const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"] as const;

export const EXCLUDE_HOLIDAYS_BIT = 1 << 7;

export interface RepeatTimeValue {
    weekdaysBits: number;
    startTime: string;
    endTime: string;
}

export function generateDescription(weekdaysBits: number): string {
    const excludeHolidays = !!(weekdaysBits & EXCLUDE_HOLIDAYS_BIT);
    const daysOnly = weekdaysBits & ~EXCLUDE_HOLIDAYS_BIT;

    const selectedDays = WEEKDAY_LABELS.reduce((acc, _, index) => {
        if (daysOnly & (1 << index)) {
            acc.push(index);
        }
        return acc;
    }, [] as number[]);

    const isWorkDays =
        selectedDays.length === 5 &&
        [1, 2, 3, 4, 5].every((day) => selectedDays.includes(day)) &&
        ![0, 6].some((day) => selectedDays.includes(day));

    const isEveryDay = selectedDays.length === 7;

    if (isWorkDays) {
        return excludeHolidays ? "工作日" : "周一至周五";
    }

    if (isEveryDay) {
        return excludeHolidays ? "每天 除节假日" : "每天";
    }

    const dayLabels = selectedDays.map((day) => `周${WEEKDAY_LABELS[day]}`).join(" ");

    return excludeHolidays ? `${dayLabels} 除节假日` : dayLabels;
}

export function parseRepeatTimeString(value: string): RepeatTimeValue {
    const [weekdaysBits, startTime, endTime] = value.split("|");
    return {
        weekdaysBits: parseInt(weekdaysBits),
        startTime,
        endTime,
    };
}

export function formatRepeatTimeValue(value: RepeatTimeValue): string {
    return `${value.weekdaysBits}|${value.startTime}|${value.endTime}`;
}
