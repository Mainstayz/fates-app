import type { Matter, NotificationRecord, RepeatTask } from './store';
import { getActiveRepeatTasks, getMattersByRange, createMatter, getKV, setKV } from './store';
import { emit } from '@tauri-apps/api/event';

// Constants
const NOTIFICATION_MESSAGE = 'notification-message';
const NOTIFICATION_RELOAD_TIMELINE_DATA = 'notification-reload-timeline-data';
const SETTING_KEY_WORK_START_TIME = 'work_start_time';
const SETTING_KEY_WORK_END_TIME = 'work_end_time';
const SETTING_KEY_CHECK_INTERVAL = 'check_interval';
const SETTING_KEY_NOTIFY_BEFORE_MINUTES = 'notify_before_minutes';

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
    NewTask
}

interface Notification {
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
        const [hours, minutes] = timeStr.split(':').map(Number);
        return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
    }

    static isInWorkHours(currentTime: Date, workStart: string, workEnd: string): boolean {
        const startTime = this.parseTime(workStart);
        const endTime = this.parseTime(workEnd);

        if (workEnd === '24:00') {
            return currentTime >= startTime;
        }

        return currentTime >= startTime && currentTime <= endTime;
    }
}

// Repeat Task Handler
class RepeatTaskHandler {
    static isAvailableToday(task: RepeatTask, now: Date): boolean {
        const parts = task.repeat_time.split('|');
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
            // TODO: Add holiday checking logic here if needed
            return true;
        }

        return true;
    }

    static getTimeRange(task: RepeatTask): [Date, Date] | null {
        const parts = task.repeat_time.split('|');
        if (parts.length !== 3) {
            return null;
        }

        const startTime = TimeUtils.parseTime(parts[1]);
        const endTime = TimeUtils.parseTime(parts[2]);

        return [startTime, endTime];
    }

    static createTodayTask(task: RepeatTask, now: Date, timeRange: [Date, Date]): Matter {
        const [startTime, endTime] = timeRange;

        const color = task.priority === 1 ? 'red' : task.priority === 0 ? 'blue' : 'green';

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
            reserved_5: undefined
        };
    }
}

// Notification Manager
export class NotificationManager {
    private config: NotificationConfig;
    private checkInterval: NodeJS.Timeout | null = null;

    constructor(config: NotificationConfig) {
        this.config = config;
    }

    static async initialize(): Promise<NotificationManager> {
        const startTime = await getKV(SETTING_KEY_WORK_START_TIME) || '00:01';
        const endTime = await getKV(SETTING_KEY_WORK_END_TIME) || '23:59';
        const notifyBefore = await getKV(SETTING_KEY_NOTIFY_BEFORE_MINUTES) || '15';

        const config: NotificationConfig = {
            workStartTime: startTime,
            workEndTime: endTime,
            checkInterval: 1,
            notifyBefore: parseInt(notifyBefore, 10)
        };

        const manager = new NotificationManager(config);
        manager.startNotificationLoop();
        return manager;
    }

    private async startNotificationLoop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        this.checkInterval = setInterval(async () => {
            await this.checkNotifications();
        }, this.config.checkInterval * 60 * 1000);
    }

    private async checkNotifications() {
        const now = new Date();

        // Check if in work hours
        if (!TimeUtils.isInWorkHours(now, this.config.workStartTime, this.config.workEndTime)) {
            console.debug(`Current time ${now} is not in work hours`);
            return;
        }

        // Get today's matters
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const matters = await getMattersByRange(todayStart.toISOString(), todayEnd.toISOString());

        // Check repeat tasks
        const newMatters = await this.checkRepeatTasks(now, matters);
        if (newMatters.length > 0) {
            await this.createNotificationRecord({
                id: crypto.randomUUID(),
                title: 'New Repeat Tasks',
                message: `Created ${newMatters.length} new repeat tasks`,
                timestamp: now.toISOString(),
                notificationType: NotificationType.NewTask
            });
            return;
        }

        // Check upcoming tasks
        if (await this.shouldCheckUpcoming()) {
            const upcomingNotifications = this.checkUpcomingTasks(now, matters);
            for (const notification of upcomingNotifications) {
                await this.createNotificationRecord(notification);
            }
        }

        // Check no tasks
        if (await this.shouldCheckNoTasks()) {
            if (this.shouldNotifyNoTasks(now, matters)) {
                await this.createNotificationRecord({
                    id: crypto.randomUUID(),
                    title: 'No Planned Tasks',
                    message: 'Consider planning some tasks',
                    timestamp: now.toISOString(),
                    notificationType: NotificationType.NoTask
                });
            }
        }
    }

    private async checkRepeatTasks(now: Date, existingMatters: Matter[]): Promise<Matter[]> {
        const repeatTasks = await getActiveRepeatTasks();
        const createdMatters: Matter[] = [];

        for (const task of repeatTasks) {
            if (!RepeatTaskHandler.isAvailableToday(task, now)) {
                continue;
            }

            const taskExists = existingMatters.some(m => m.reserved_2 === task.id);
            if (taskExists) {
                continue;
            }

            const storeKey = `repeat_task_${task.id}_${now.toISOString().split('T')[0]}`;
            const created = await getKV(storeKey);
            if (created === '1') {
                continue;
            }

            const timeRange = RepeatTaskHandler.getTimeRange(task);
            if (timeRange) {
                const newMatter = RepeatTaskHandler.createTodayTask(task, now, timeRange);
                await createMatter(newMatter);
                await setKV(storeKey, '1');
                createdMatters.push(newMatter);
            }
        }

        if (createdMatters.length > 0) {
            await emit(NOTIFICATION_RELOAD_TIMELINE_DATA, {});
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
                notifications.push({
                    id: crypto.randomUUID(),
                    title: 'Task Ending Soon',
                    message: `Task "${matter.title}" will end in ${minutesToEnd} minutes`,
                    timestamp: now.toISOString(),
                    notificationType: NotificationType.TaskEnd
                });
            } else if (minutesToStart <= this.config.notifyBefore && minutesToStart >= 0) {
                notifications.push({
                    id: crypto.randomUUID(),
                    title: 'Task Starting Soon',
                    message: `Task "${matter.title}" will start in ${minutesToStart} minutes`,
                    timestamp: now.toISOString(),
                    notificationType: NotificationType.TaskStart
                });
            }
        }

        return notifications;
    }

    private shouldNotifyNoTasks(now: Date, matters: Matter[]): boolean {
        const future = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

        return !matters.some(matter => {
            const startTime = new Date(matter.start_time);
            const endTime = new Date(matter.end_time);
            return (startTime >= now && startTime <= future) ||
                   (startTime <= now && endTime >= now);
        });
    }

    private async createNotificationRecord(notification: Notification) {
        const record: NotificationRecord = {
            id: notification.id,
            title: notification.title,
            content: notification.message,
            type_: 0,
            status: 0,
            created_at: notification.timestamp,
            related_task_id: undefined,
            read_at: undefined,
            expire_at: undefined,
            action_url: undefined,
            reserved_1: undefined,
            reserved_2: undefined,
            reserved_3: undefined,
            reserved_4: undefined,
            reserved_5: undefined
        };

        await this.createNotification(record);
        await emit(NOTIFICATION_MESSAGE, {});
    }

    private async createNotification(notification: NotificationRecord) {
        // You can add any additional notification logic here
        // For example, showing system notifications or updating UI
        console.log('Creating notification:', notification);
    }

    private async shouldCheckUpcoming(): Promise<boolean> {
        const key = 'last_check_upcoming_task_time';
        return this.checkKVStoreKeyUpdateTime(key, 15);
    }

    private async shouldCheckNoTasks(): Promise<boolean> {
        const key = 'last_check_no_task_time';
        const interval = parseInt(await getKV(SETTING_KEY_CHECK_INTERVAL) || '120', 10);
        return this.checkKVStoreKeyUpdateTime(key, interval);
    }

    private async checkKVStoreKeyUpdateTime(key: string, durationMinutes: number): Promise<boolean> {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const updateTimeStr = await getKV(key) || todayStart.toISOString();

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
