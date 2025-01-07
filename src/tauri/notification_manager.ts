import { appConfig } from "$src/app-config";
import { OpenAIClient } from "$src/openai";
import { generateDescription, parseRepeatTimeString } from "$src/lib/utils/repeatTime";
import dayjs from "dayjs";
import { _, locale } from "svelte-i18n";
import { get } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { isHolidayDate } from "../i18n/holiday-cn";
import "../i18n/i18n";
import type { Matter, RepeatTask, Todo } from "../store";
import { createMatter, getActiveRepeatTasks, getAllTodos, getMattersByRange } from "../store";
import type StatisticalAnalysis from "$src/lib/components/statistical-analysis.svelte";

type NotificationCallback = (notification: Notification) => void;

export enum NotificationType {
    TaskStart,
    TaskEnd,
    NoTask,
    NewTask,
    AINotification,
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

        const [startHours, startMinutes] = workStart.split(":").map(Number);
        const startTotalMinutes = startHours * 60 + startMinutes;

        if (workEnd === "24:00") {
            return currentTotalMinutes >= startTotalMinutes;
        }

        const [endHours, endMinutes] = workEnd.split(":").map(Number);
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
    private static instance: NotificationManager | null = null;
    private checkInterval: NodeJS.Timeout | null = null;
    private notificationCallbacks: Set<NotificationCallback> = new Set();

    private constructor() {
        // private constructor for singleton
    }

    public static getInstance(): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager.instance;
    }

    /**
     * Adds a notification callback and returns a function to remove it
     * @param callback The callback function to be added
     * @returns A function that when called will remove the callback
     */
    public addNotificationCallback(callback: NotificationCallback): () => void {
        this.notificationCallbacks.add(callback);
        return () => {
            this.notificationCallbacks.delete(callback);
        };
    }

    public static initialize(): NotificationManager {
        const manager = NotificationManager.getInstance();
        manager.startNotificationLoop();
        return manager;
    }

    private async startNotificationLoop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        console.log("Start notification loop ...");
        this.checkInterval = setInterval(async () => {
            console.log(`Checking notifications at ${new Date().toLocaleString()}`);
            await this.checkNotifications();
        }, 1 * 60 * 1000); // 1 min
    }

    public async sendTestNotification() {
        await this.onReceiveNotification(get(_)("app.messages.testNotification"), get(_)("app.messages.testNotificationDescription"), NotificationType.NewTask);
    }

    public async checkNotifications(ignoreRestriction: boolean = false): Promise<boolean> {
        let language = appConfig.language;

        const startTime = appConfig.notifications.workStart || "00:01";
        const endTime = appConfig.notifications.workEnd || "23:59";
        console.log("Current language:", language);

        const now = new Date();

        // local time
        if (!ignoreRestriction) {
            console.log(`Checking if in work hours: ${now.toLocaleString()}`);
            if (!TimeUtils.isInWorkHours(now, startTime, endTime)) {
                console.log(`SKIPPED!!! Not in work hours, start time: ${startTime}, end time: ${endTime}`);
                return false;
            }
        }

        // Get today's matters
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const matters = await getMattersByRange(todayStart.toISOString(), todayEnd.toISOString());

        // Check repeat tasks
        console.log(`Checking repeat tasks at ${now.toLocaleString()}`);
        const createdMatters = await this.checkRepeatTasks(now, matters);
        if (createdMatters.length > 0) {
            console.log(
                `Creating notification for new repeat tasks at ${now.toLocaleString()}, ${
                    createdMatters.length
                } new repeat tasks`
            );

            let title = get(_)("app.messages.newRepeatTasks");
            let message = get(_)("app.messages.newRepeatTasksDescription", {
                values: { count: createdMatters.length },
            });
            this.onReceiveNotification(title, message, NotificationType.NewTask);
            return true;
        }

        let aiEnabled = appConfig.aiEnabled;
        if (aiEnabled) {
            return this.startAINotificationCheck(now, matters, ignoreRestriction);
        } else {
            return this.startNormalNotificationCheck(now, matters, ignoreRestriction);
        }
    }

    private async startAINotificationCheck(
        now: Date,
        matters: Matter[],
        ignoreRestriction: boolean = false
    ): Promise<boolean> {
        if (!ignoreRestriction) {
            let isInTaskTimeRange = false;
            for (const matter of matters) {
                const startTime = dayjs(matter.start_time).toDate();
                const endTime = dayjs(matter.end_time).toDate();
                console.log(`check task time range: ${matter.title}`);
                console.log(`- start time: ${startTime.toLocaleString()}`);
                console.log(`- end time: ${endTime.toLocaleString()}`);
                console.log(`- current time: ${now.toLocaleString()}`);
                if (now >= startTime && now <= endTime) {
                    console.log("- current time in task time range");
                    isInTaskTimeRange = true;
                    break;
                } else {
                    console.log("- current time not in task time range");
                }
            }
            if (isInTaskTimeRange) {
                console.log("current time in task time range, skip ai notification");
                return false;
            }

            let shouldCheck = await this.shouldCheckAINotification();
            if (!shouldCheck) {
                console.log("skip ai notification");
                return false;
            }
        }
        let aiReminderPrompt = appConfig.aiReminderPrompt;
        if (aiReminderPrompt == "") {
            aiReminderPrompt = "你是一个提醒助手，请根据用户的需要，提醒用户完成任务。";
        }
        let systemPrompt = aiReminderPrompt;
        systemPrompt += "\n";
        systemPrompt += `
你具备以下能力：

- 深刻理解人类大脑的运作，尤其是专注力和效率的科学原理。你关注用户的成长与发展，致力于帮助他们充分挖掘潜能。
- 具备数据分析、时间管理、任务优先级排序和自然语言处理的能力，能够理解和处理 CSV 格式的数据。

工作流如下：

1. 如果用户当前没有安排任务，根据用户习惯提供建设性的建议或提示用户选择待办事项。
2. 监控用户的日程，确保每天至少有一段时间用于个人成长和自我提升。
3. 如果发现用户在黄金专注力时间段内未安排重要任务或一天内未安排自我提升活动，生成提醒。
4. 根据用户的具体情况和偏好，提供个性化的提醒和建议。

提醒应简洁明了，直接相关。每次回复仅提供一个"提醒"。

请确保输出内容严格遵守 JSON 格式，例子：

{ "title":"<提醒标题>", "description": "<提醒内容>" }

`;

        let nowDate = dayjs().format("YYYY-MM-DD");
        systemPrompt += "\n\n";
        systemPrompt += `今天的日期是：${nowDate}`;

        let txtResult = "";
        const start = dayjs().startOf("day").toISOString();
        const end = dayjs().endOf("day").toISOString();
        let list = await getMattersByRange(start, end);
        txtResult += "今天的任务:\n";
        if (list.length > 0) {
            txtResult += "```csv\n";
            txtResult += ["开始时间", "结束时间", "标题", "标签"].join(" | ") + "\n";
            list.forEach((item: Matter) => {
                txtResult += `${new Date(item.start_time).toLocaleString()} | ${new Date(
                    item.end_time
                ).toLocaleString()} | ${item.title} | ${item.tags ?? ""}\n`;
            });
            txtResult += "```\n";
        } else {
            txtResult += "无任务。（今天没有安排任务）\n";
        }

        txtResult += "\n";

        let todoList = await getAllTodos();
        todoList = todoList.filter((item: Todo) => item.status === "todo");
        if (todoList.length > 0) {
            txtResult += "以下是所有待办事项:\n";
            txtResult += "```csv\n";
            txtResult += ["标题"].join(" | ") + "\n";
            todoList.forEach((item: Todo) => {
                txtResult += `${item.title}\n`;
            });
            txtResult += "```\n";
            txtResult += "\n";
        }

        let repeatTask = await getActiveRepeatTasks();
        if (repeatTask.length > 0) {
            txtResult += "以下是所有重复任务:\n";
            txtResult += "```csv\n";
            txtResult += ["标题", "标签", "重复时间"].join(" | ") + "\n";
            repeatTask.forEach((item: RepeatTask) => {
                const { weekdaysBits, startTime, endTime } = parseRepeatTimeString(item.repeat_time);
                const description = generateDescription(weekdaysBits);
                const fixedDescription = description.split("|").join(",");
                txtResult += `${item.title} | ${item.tags} | ${fixedDescription},${startTime}-${endTime}\n`;
            });
            txtResult += "```\n";
        }
        systemPrompt += "\n\n";
        systemPrompt += txtResult;

        let baseUrl = appConfig.aiBaseUrl;
        let apiKey = appConfig.aiApiKey;
        let model = appConfig.aiModelId;

        let client = new OpenAIClient({
            apiKey,
            baseURL: baseUrl || undefined,
            defaultModel: model,
        });

        // console.log(systemPrompt);
        let sessionId = uuidv4();
        await client.setSystemPrompt(sessionId, systemPrompt);

        let message = `现在时间是：${now.toLocaleString()}，请根据用户的情况，生成一个提醒`;
        let result = await client.sendMessage(sessionId, message);
        try {
            console.log(result);
            let jsonResult = JSON.parse(result);
            let title = jsonResult.title;
            let description = jsonResult.description;
            this.onReceiveNotification(title, description, NotificationType.AINotification);
        } catch (error) {
            console.error("Failed to parse JSON:", error);
        } finally {
            return true;
        }
    }

    private async startNormalNotificationCheck(
        now: Date,
        matters: Matter[],
        ignoreRestriction: boolean = false
    ): Promise<boolean> {
        // Check upcoming tasks
        let shouldCheckUpcoming = await this.shouldCheckUpcoming();

        if (shouldCheckUpcoming && !ignoreRestriction) {
            console.log(`Checking upcoming tasks at ${now.toISOString()}`);
            const notifyBefore = appConfig.notifications.checkIntervalMinutes || 15;
            const upcomingNotifications = this.checkUpcomingTasks(now, matters, notifyBefore);
            if (upcomingNotifications.length == 0) {
                console.log("No upcoming tasks");
            } else {
                console.log(`Found ${upcomingNotifications.length} upcoming tasks`);
                let notification = upcomingNotifications[0];
                this.onReceiveNotification(notification.title, notification.message, notification.notificationType);
                return true;
            }
        }

        // Check no tasks
        let shouldCheckNoTasks = await this.shouldCheckNoTasks();
        if (!shouldCheckNoTasks && !ignoreRestriction) {
            console.log("No need to check no tasks");
            return false;
        }

        console.log(`Checking no tasks at ${now.toISOString()}`);
        if (this.shouldNotifyNoTasks(now, matters) && !ignoreRestriction) {
            let title = get(_)("app.messages.noPlannedTasks");
            let message = get(_)("app.messages.noPlannedTasksDescription");
            this.onReceiveNotification(title, message, NotificationType.NoTask);
            return true;
        }
        return false;
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
            const created = appConfig.getValueForKey(storeKey);
            if (created === "1") {
                continue;
            }

            const timeRange = RepeatTaskHandler.getTimeRange(task);
            if (timeRange) {
                const newMatter = RepeatTaskHandler.createTodayTask(task, now, timeRange);
                await createMatter(newMatter);
                appConfig.setValueForKey(storeKey, "1");
                createdMatters.push(newMatter);
            }
        }
        return createdMatters;
    }

    private checkUpcomingTasks(now: Date, matters: Matter[], notifyBefore: number): Notification[] {
        const notifications: Notification[] = [];

        for (const matter of matters) {
            const endTime = new Date(matter.end_time);
            const startTime = new Date(matter.start_time);

            const minutesToEnd = Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60));
            const minutesToStart = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));

            if (minutesToEnd <= notifyBefore && minutesToEnd > 0) {
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
            } else if (minutesToStart <= notifyBefore && minutesToStart >= 0) {
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
        const notificationRecord: Notification = {
            id: crypto.randomUUID(),
            title: title,
            message: message,
            timestamp: new Date().toISOString(),
            notificationType: notificationType,
        };

        this.notificationCallbacks.forEach((callback) => {
            callback(notificationRecord);
        });
    }

    private async shouldCheckUpcoming(): Promise<boolean> {
        const key = "last_check_upcoming_task_time";
        return this.checkKVStoreKeyUpdateTime(key, 15);
    }

    private async shouldCheckNoTasks(): Promise<boolean> {
        const key = "last_check_no_task_time";
        const interval = appConfig.notifications.checkIntervalMinutes || 120;
        return this.checkKVStoreKeyUpdateTime(key, interval);
    }

    private async shouldCheckAINotification(): Promise<boolean> {
        const key = "last_check_ai_notification_time";
        const interval = appConfig.notifications.checkIntervalMinutes || 120;
        return this.checkKVStoreKeyUpdateTime(key, interval);
    }

    private async checkKVStoreKeyUpdateTime(key: string, durationMinutes: number): Promise<boolean> {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const updateTimeStr = appConfig.getValueForKey(key) || todayStart.toISOString();

        const updateTime = new Date(updateTimeStr);
        const minutes = Math.floor((now.getTime() - updateTime.getTime()) / (1000 * 60));

        if (minutes > durationMinutes) {
            appConfig.setValueForKey(key, now.toISOString());
            return true;
        }
        console.log(`${key} update time not exceed ${durationMinutes} minutes, skip check`);
        return false;
    }

    public stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

export const notificationManager = NotificationManager.initialize();

export default notificationManager;
