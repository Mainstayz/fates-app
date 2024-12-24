import "../i18n/i18n";
import type { Matter, RepeatTask } from "../store";
import { getActiveRepeatTasks, getMattersByRange, createMatter, getKV, setKV } from "../store";
import { isHolidayDate } from "../i18n/holiday-cn";
import { _, locale } from "svelte-i18n";
import { get } from "svelte/store";
import {
    SETTING_KEY_LANGUAGE,
    SETTING_KEY_WORK_START_TIME,
    SETTING_KEY_WORK_END_TIME,
    SETTING_KEY_NOTIFICATION_CHECK_INTERVAL,
    SETTING_KEY_NOTIFY_BEFORE_MINUTES,
} from "../config";


// Types
interface NotificationConfig {
    workStartTime: string;
    workEndTime: string;
    checkInterval: number;
    notifyBefore: number;
}

enum NotificationType {
    TaskStart,
    TaskEnd,
    NoTask,
    NewTask,
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    notificationType: NotificationType;
}

// Time Utils
class TimeUtils {

    static parseTime(timeStr: string): Date {
        const today = new Date();
        const [hours, minutes] = timeStr.split(":").map(Number);
        return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
    }

    static isInWorkHours(currentTime: Date, workStart: string, workEnd: string): boolean {
        // Convert to hours and minutes for direct comparison to avoid timezone issues
        const currentHours = currentTime.getHours();
        const currentMinutes = currentTime.getMinutes();
        const currentTotalMinutes = currentHours * 60 + currentMinutes;

        const [startHours, startMinutes] = workStart.split(':').map(Number);
        const startTotalMinutes = startHours * 60 + startMinutes;

        if (workEnd === "24:00") {
            return currentTotalMinutes >= startTotalMinutes;
        }

        const [endHours, endMinutes] = workEnd.split(':').map(Number);
        const endTotalMinutes = endHours * 60 + endMinutes;

        return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
    }
}

// Repeat Task Handler
class RepeatTaskHandler {
    static isAvailableToday(task: RepeatTask, now: Date): boolean {
        const parts = task.repeat_time.split("|");
        if (parts.length !== 3) {
            console.error(`Invalid repeat_time format: ${task.repeat_time}`);
            return false;
        }

        const bits = parseInt(parts[0], 10);
        if (isNaN(bits)) {
            console.error(`Failed to parse bits value: ${parts[0]}`);
            return false;
        }

        // Check weekday match
        const weekday = now.getDay();
        const weekdayBit = 1 << weekday;
        if ((bits & weekdayBit) === 0) {
            return false;
        }

        // Check holidays (simplified - you may want to add actual holiday checking logic)
        const excludeHolidays = (bits & (1 << 7)) !== 0;
        if (excludeHolidays) {
            // 使用 HolidayManager 检查是否为节假日
            const isHoliday = isHolidayDate(now);
            if (isHoliday) {
                console.log(`Current time ${now} is a holiday`);
                return false;
            } else {
                console.log(`Current time ${now} is not a holiday`);
            }
        }

        return true;
    }

    static getTimeRange(task: RepeatTask): [Date, Date] | null {
        const parts = task.repeat_time.split("|");
        if (parts.length !== 3) {
            return null;
        }

        const startTime = TimeUtils.parseTime(parts[1]);
        const endTime = TimeUtils.parseTime(parts[2]);

        return [startTime, endTime];
    }

    static createTodayTask(task: RepeatTask, now: Date, timeRange: [Date, Date]): Matter {
        const [startTime, endTime] = timeRange;

        const color = task.priority === 1 ? "red" : task.priority === 0 ? "blue" : "green";

        return {
            id: crypto.randomUUID(),
            title: task.title,
            description: task.description,
            tags: task.tags,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            priority: task.priority,
            type_: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reserved_1: color,
            reserved_2: task.id,
            reserved_3: undefined,
            reserved_4: undefined,
            reserved_5: undefined,
        };
    }
}

// Notification Manager
export class NotificationManager {
    private config: NotificationConfig;
    private checkInterval: NodeJS.Timeout | null = null;
    private notificationCallback: (notification: Notification) => void;

    constructor(config: NotificationConfig, notificationCallback: (notification: Notification) => void) {
        this.config = config;
        this.notificationCallback = notificationCallback;
    }

    static async initialize(callback: (notification: Notification) => void): Promise<NotificationManager> {
        const startTime = (await getKV(SETTING_KEY_WORK_START_TIME)) || "00:01";
        const endTime = (await getKV(SETTING_KEY_WORK_END_TIME)) || "23:59";
        const notifyBefore = (await getKV(SETTING_KEY_NOTIFY_BEFORE_MINUTES)) || "15";

        const config: NotificationConfig = {
            workStartTime: startTime,
            workEndTime: endTime,
            checkInterval: 1,
            notifyBefore: parseInt(notifyBefore, 10),
        };

        const manager = new NotificationManager(config, callback);
        manager.startNotificationLoop();
        return manager;
    }

    private async startNotificationLoop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.checkInterval = setInterval(async () => {
            console.log(`Checking notifications at ${new Date().toISOString()}`);
            await this.checkNotifications();
        }, this.config.checkInterval * 60 * 1000);
    }

    private async checkNotifications() {
        let language = await getKV(SETTING_KEY_LANGUAGE);
        console.log("Current language:", language);
        if (language) {
            locale.set(language);
        }

        const now = new Date();

        // local time
        console.log(`Checking if in work hours: ${now.toLocaleString()}`);
        if (!TimeUtils.isInWorkHours(now, this.config.workStartTime, this.config.workEndTime)) {

            return;
        }
        console.log("In work hours");

        // Get today's matters
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const matters = await getMattersByRange(todayStart.toISOString(), todayEnd.toISOString());

        // Check repeat tasks
        console.log(`Checking repeat tasks at ${now.toISOString()}`);
        const newMatters = await this.checkRepeatTasks(now, matters);
        if (newMatters.length > 0) {
            console.log(
                `Creating notification for new repeat tasks at ${now.toISOString()}, ${
                    newMatters.length
                } new repeat tasks`
            );
            // 创建通知, 通知类型为 NewTask,
            let title = get(_)("app.messages.newRepeatTasks");
            let message = get(_)("app.messages.newRepeatTasksDescription", { values: { count: newMatters.length } });
            this.onReceiveNotification(title, message, NotificationType.NewTask);
            return;
        }
        console.log("No new repeat tasks");

        // Check upcoming tasks
        let shouldCheckUpcoming = await this.shouldCheckUpcoming();
        if (shouldCheckUpcoming) {
            console.log(`Checking upcoming tasks at ${now.toISOString()}`);
            const upcomingNotifications = this.checkUpcomingTasks(now, matters);
            if (upcomingNotifications.length == 0) {
                console.log("No upcoming tasks");
            } else {
                console.log(`Found ${upcomingNotifications.length} upcoming tasks`);
                let notification = upcomingNotifications[0];
                this.notificationCallback(notification);
                return;
            }
        }

        // Check no tasks
        let shouldCheckNoTasks = await this.shouldCheckNoTasks();
        if (!shouldCheckNoTasks) {
            console.log("No need to check no tasks");
            return;
        }

        console.log(`Checking no tasks at ${now.toISOString()}`);
        if (this.shouldNotifyNoTasks(now, matters)) {
            let title = get(_)("app.messages.noPlannedTasks");
            let message = get(_)("app.messages.noPlannedTasksDescription");
            this.onReceiveNotification(title, message, NotificationType.NoTask);
        }
    }

    private async checkRepeatTasks(now: Date, existingMatters: Matter[]): Promise<Matter[]> {
        const repeatTasks = await getActiveRepeatTasks();
        if (repeatTasks.length === 0) {
            console.log("No active repeat tasks, skip");
            return [];
        }
        const createdMatters: Matter[] = [];
        for (const task of repeatTasks) {
            if (!RepeatTaskHandler.isAvailableToday(task, now)) {
                continue;
            }

            const taskExists = existingMatters.some((m) => m.reserved_2 === task.id);
            if (taskExists) {
                continue;
            }

            const storeKey = `repeat_task_${task.id}_${now.toISOString().split("T")[0]}`;
            const created = await getKV(storeKey);
            if (created === "1") {
                continue;
            }

            const timeRange = RepeatTaskHandler.getTimeRange(task);
            if (timeRange) {
                const newMatter = RepeatTaskHandler.createTodayTask(task, now, timeRange);
                await createMatter(newMatter);
                await setKV(storeKey, "1");
                createdMatters.push(newMatter);
            }
        }
        return createdMatters;
    }

    private checkUpcomingTasks(now: Date, matters: Matter[]): Notification[] {
        const notifications: Notification[] = [];

        for (const matter of matters) {
            const endTime = new Date(matter.end_time);
            const startTime = new Date(matter.start_time);

            const minutesToEnd = Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60));
            const minutesToStart = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));

            if (minutesToEnd <= this.config.notifyBefore && minutesToEnd > 0) {
                let title = get(_)("app.messages.taskEndingSoon");
                let message = get(_)("app.messages.taskEndingSoonDescription", {
                    values: { title: matter.title, minutes: minutesToEnd },
                });
                notifications.push({
                    id: crypto.randomUUID(),
                    title: title,
                    message: message,
                    timestamp: now.toISOString(),
                    notificationType: NotificationType.TaskEnd,
                });
            } else if (minutesToStart <= this.config.notifyBefore && minutesToStart >= 0) {
                let title = get(_)("app.messages.taskStartingSoon");
                let message = get(_)("app.messages.taskStartingSoonDescription", {
                    values: { title: matter.title, minutes: minutesToStart },
                });
                notifications.push({
                    id: crypto.randomUUID(),
                    title: title,
                    message: message,
                    timestamp: now.toISOString(),
                    notificationType: NotificationType.TaskStart,
                });
            }
        }

        return notifications;
    }

    private shouldNotifyNoTasks(now: Date, matters: Matter[]): boolean {
        const future = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

        return !matters.some((matter) => {
            const startTime = new Date(matter.start_time);
            const endTime = new Date(matter.end_time);
            return (startTime >= now && startTime <= future) || (startTime <= now && endTime >= now);
        });
    }

    private async onReceiveNotification(title: string, message: string, notificationType: NotificationType) {
        let notificationRecord: Notification = {
            id: crypto.randomUUID(),
            title: title,
            message: message,
            timestamp: new Date().toISOString(),
            notificationType: notificationType,
        };
        if (this.notificationCallback) {
            this.notificationCallback(notificationRecord);
        }
    }

    private async shouldCheckUpcoming(): Promise<boolean> {
        const key = "last_check_upcoming_task_time";
        return this.checkKVStoreKeyUpdateTime(key, 15);
    }

    private async shouldCheckNoTasks(): Promise<boolean> {
        const key = "last_check_no_task_time";
        const interval = parseInt((await getKV(SETTING_KEY_NOTIFICATION_CHECK_INTERVAL)) || "120", 10);
        return this.checkKVStoreKeyUpdateTime(key, interval);
    }

    private async checkKVStoreKeyUpdateTime(key: string, durationMinutes: number): Promise<boolean> {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const updateTimeStr = (await getKV(key)) || todayStart.toISOString();

        const updateTime = new Date(updateTimeStr);
        const minutes = Math.floor((now.getTime() - updateTime.getTime()) / (1000 * 60));

        if (minutes > durationMinutes) {
            await setKV(key, now.toISOString());
            return true;
        }

        return false;
    }

    public stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

export default NotificationManager;
