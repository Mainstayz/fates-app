const holidays: Record<string, boolean> = {
    // 元旦
    "2025-01-01": true,
    // 春节前调休
    "2025-01-26": false,
    // 春节假期
    "2025-01-28": true,
    "2025-01-29": true,
    "2025-01-30": true,
    "2025-01-31": true,
    "2025-02-01": true,
    "2025-02-02": true,
    "2025-02-03": true,
    "2025-02-04": true,
    // 春节后调休
    "2025-02-08": false,
    // 清明节假期
    "2025-04-04": true,
    "2025-04-05": true,
    "2025-04-06": true,
    // 劳动节前调休
    "2025-04-27": false,
    // 劳动节假期
    "2025-05-01": true,
    "2025-05-02": true,
    "2025-05-03": true,
    "2025-05-04": true,
    "2025-05-05": true,
    // 端午节假期
    "2025-05-31": true,
    "2025-06-01": true,
    "2025-06-02": true,
    // 国庆节和中秋节前调休
    "2025-09-28": false,
    // 国庆节和中秋节假期
    "2025-10-01": true,
    "2025-10-02": true,
    "2025-10-03": true,
    "2025-10-04": true,
    "2025-10-05": true,
    "2025-10-06": true,
    "2025-10-07": true,
    "2025-10-08": true,
    // 国庆节和中秋节后调休
    "2025-10-11": false,
};

export function isHoliday(date: string): boolean {
    return holidays[date] || false;
}

export function isHolidayDate(date: Date): boolean {
    const dateStr = date.toISOString().split("T")[0];
    return isHoliday(dateStr);
}

export function isWorkday(date: Date): boolean {
    const dateStr = date.toISOString().split("T")[0];
    return !isHoliday(dateStr);
}

