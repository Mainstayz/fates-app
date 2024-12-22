import { get } from "svelte/store";
import { locale, _ } from "svelte-i18n";

export const EXCLUDE_HOLIDAYS_BIT = 1 << 7;

export interface RepeatTimeValue {
    weekdaysBits: number;
    startTime: string;
    endTime: string;
}

export function generateDescription(weekdaysBits: number): string {
    const currentLocale = get(locale);
    const t = (key: string) => get(_)(`app.repeat.repeatTime.weekdays.${key}`);

    const excludeHolidays = !!(weekdaysBits & EXCLUDE_HOLIDAYS_BIT);
    const daysOnly = weekdaysBits & ~EXCLUDE_HOLIDAYS_BIT;

    const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const selectedDays = weekdays.reduce((acc, _, index) => {
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
        return currentLocale === "zh"
            ? excludeHolidays
                ? "工作日"
                : "周一至周五"
            : excludeHolidays
            ? "Workdays"
            : "Monday to Friday";
    }

    if (isEveryDay) {
        return currentLocale === "zh"
            ? excludeHolidays
                ? "每天|除节假日"
                : "每天"
            : excludeHolidays
            ? "Everyday|Except holidays"
            : "Everyday";
    }

    const dayLabels = selectedDays
        .map((day) => {
            const label = t(weekdays[day]);
            return currentLocale === "zh" ? `周${label}` : label;
        })
        .join("|");

    if (excludeHolidays) {
        return currentLocale === "zh" ? `${dayLabels}|除节假日` : `${dayLabels}|Except holidays`;
    }

    return dayLabels;
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
