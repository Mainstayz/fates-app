import "$src/i18n/i18n";
import { appConfig } from "$src/app-config";
import { isHolidayDate } from "$src/i18n/holiday-cn";
import { generateDescription, parseRepeatTimeString } from "$src/lib/utils/repeatTime";
import { OpenAIClient } from "$src/openai";
import platform from "$src/platform";
import type { Matter, RepeatTask, Todo } from "$src/types";
import dayjs from "dayjs";
import { _ } from "svelte-i18n";
import { get } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_AI_REMINDER_PROMPT } from "$src/config";

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
    static convertTimeStringToDate(timeString: string): Date {
        const currentDate = new Date();
        const [hours, minutes] = timeString.split(":").map(Number);
        return new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hours, minutes);
    }

    static isWithinWorkingHours(currentTime: Date, workStartTime: string, workEndTime: string): boolean {
        const currentTotalMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

        const [startHours, startMinutes] = workStartTime.split(":").map(Number);
        const workStartTotalMinutes = startHours * 60 + startMinutes;

        if (workEndTime === "24:00") {
            return currentTotalMinutes >= workStartTotalMinutes;
        }

        const [endHours, endMinutes] = workEndTime.split(":").map(Number);
        const workEndTotalMinutes = endHours * 60 + endMinutes;

        return currentTotalMinutes >= workStartTotalMinutes && currentTotalMinutes <= workEndTotalMinutes;
    }
}

// Repeat Task Handler
class RepeatTaskHandler {
    static isScheduledForToday(task: RepeatTask, currentDate: Date): boolean {
        const repeatTimeComponents = task.repeat_time.split("|");
        if (repeatTimeComponents.length !== 3) {
            console.error(`[NotificationManager] Invalid repeat_time format: ${task.repeat_time}`);
            return false;
        }

        const weekdayBitMask = parseInt(repeatTimeComponents[0], 10);
        if (isNaN(weekdayBitMask)) {
            console.error(`[NotificationManager] Failed to parse weekday bitmask value: ${repeatTimeComponents[0]}`);
            return false;
        }

        // Check weekday match
        const currentWeekday = currentDate.getDay();
        const currentWeekdayBit = 1 << currentWeekday;
        if ((weekdayBitMask & currentWeekdayBit) === 0) {
            return false;
        }

        // Check holidays (simplified - you may want to add actual holiday checking logic)
        const excludeHolidays = (weekdayBitMask & (1 << 7)) !== 0;
        if (excludeHolidays) {
            const isHoliday = isHolidayDate(currentDate);
            if (isHoliday) {
                console.log(`[NotificationManager] Current date ${currentDate} is a holiday`);
                return false;
            } else {
                console.log(`[NotificationManager] Current date ${currentDate} is not a holiday`);
            }
        }

        return true;
    }

    static getTaskTimeRange(task: RepeatTask): [Date, Date] | null {
        const repeatTimeComponents = task.repeat_time.split("|");
        if (repeatTimeComponents.length !== 3) {
            return null;
        }

        const startTime = TimeUtils.convertTimeStringToDate(repeatTimeComponents[1]);
        const endTime = TimeUtils.convertTimeStringToDate(repeatTimeComponents[2]);

        return [startTime, endTime];
    }

    static createDailyTaskInstance(task: RepeatTask, currentDate: Date, timeRange: [Date, Date]): Matter {
        const [taskStartTime, taskEndTime] = timeRange;

        const taskColor = task.priority === 1 ? "red" : task.priority === 0 ? "blue" : "green";

        return {
            id: crypto.randomUUID(),
            title: task.title,
            description: task.description,
            tags: task.tags,
            start_time: taskStartTime.toISOString(),
            end_time: taskEndTime.toISOString(),
            priority: task.priority,
            type_: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reserved_1: taskColor,
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

    public async startNotificationLoop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        console.log("[NotificationManager] Start notification loop ...");
        this.checkInterval = setInterval(async () => {
            console.log(`[NotificationManager] Checking notifications at ${new Date().toLocaleString()}`);
            try {
                await this.processNotificationCycle();
            } catch (error) {
                console.error(`[NotificationManager] Error in notification loop:`, error);
            }
        }, 1 * 60 * 1000); // 1 min
    }

    public async stopNotificationLoop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    public async sendTestNotification() {
        await this.onReceiveNotification(
            get(_)("app.messages.testNotification"),
            get(_)("app.messages.testNotificationDescription"),
            NotificationType.NewTask
        );
    }

    public async processNotificationCycle(forceCheck: boolean = true): Promise<boolean> {
        let userLanguage = appConfig.getConfig().language;
        let notifications = appConfig.getNotifications();
        const workStartTime = notifications.workStart || "00:01";
        const workEndTime = notifications.workEnd || "23:59";
        console.log(`[NotificationManager] Current language: ${userLanguage}`);

        const currentDateTime = new Date();

        // local time
        if (forceCheck) {
            console.log(`[NotificationManager] Checking if in work hours: ${currentDateTime.toLocaleString()}`);
            if (!TimeUtils.isWithinWorkingHours(currentDateTime, workStartTime, workEndTime)) {
                console.log(
                    `[NotificationManager] SKIPPED!!! Not in work hours, start time: ${workStartTime}, end time: ${workEndTime}`
                );
                return false;
            }
        }

        // Get today's matters
        const todayStartTime = new Date(
            currentDateTime.getFullYear(),
            currentDateTime.getMonth(),
            currentDateTime.getDate()
        );
        const todayEndTime = new Date(
            currentDateTime.getFullYear(),
            currentDateTime.getMonth(),
            currentDateTime.getDate(),
            23,
            59,
            59
        );
        const todayMatters = await platform.instance.storage.getMattersByRange(
            todayStartTime.toISOString(),
            todayEndTime.toISOString()
        );

        // Check repeat tasks
        console.log(`[NotificationManager] Checking repeat tasks at ${currentDateTime.toLocaleString()}`);
        const newlyCreatedMatters = await this.createDueRepeatTasks(currentDateTime, todayMatters);
        if (newlyCreatedMatters.length > 0) {
            console.log(
                `[NotificationManager] Creating notification for new repeat tasks at ${currentDateTime.toLocaleString()}, ${
                    newlyCreatedMatters.length
                } new repeat tasks`
            );

            let notificationTitle = get(_)("app.messages.newRepeatTasks");
            let notificationMessage = get(_)("app.messages.newRepeatTasksDescription", {
                values: { count: newlyCreatedMatters.length },
            });
            this.onReceiveNotification(notificationTitle, notificationMessage, NotificationType.NewTask);
            return true;
        }

        let isAiEnabled = appConfig.getAIConfig().enabled;
        if (isAiEnabled) {
            return this.processAINotifications(currentDateTime, todayMatters, forceCheck);
        } else {
            return this.processStandardNotifications(currentDateTime, todayMatters, forceCheck);
        }
    }

    private async processAINotifications(now: Date, matters: Matter[], forceCheck: boolean = true): Promise<boolean> {
        let aiConfig = appConfig.getAIConfig();
        if (forceCheck) {
            let isInTaskTimeRange = false;
            for (const matter of matters) {
                const startTime = dayjs(matter.start_time).toDate();
                const endTime = dayjs(matter.end_time).toDate();
                console.log(`[NotificationManager] Check task time range: ${matter.title}`);
                console.log(`- start time: ${startTime.toLocaleString()}`);
                console.log(`- end time: ${endTime.toLocaleString()}`);
                console.log(`- current time: ${now.toLocaleString()}`);
                if (now >= startTime && now <= endTime) {
                    console.log(`[NotificationManager] Current time in task time range`);
                    isInTaskTimeRange = true;
                    break;
                } else {
                    console.log(`[NotificationManager] Current time not in task time range`);
                }
            }
            if (isInTaskTimeRange) {
                console.log(`[NotificationManager] Current time in task time range, skip ai notification`);
                return false;
            }

            let shouldCheck = await this.isAINotificationCheckDue();
            if (!shouldCheck) {
                console.log(`[NotificationManager] Skip ai notification, not due`);
                return false;
            }
        }
        let aiReminderPrompt = aiConfig.reminderPrompt;
        if (aiReminderPrompt == "") {
            aiReminderPrompt = DEFAULT_AI_REMINDER_PROMPT;
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

以 JSON 的形式输出，不要输出任何其他内容。

{ "title":"<提醒标题>", "description": "<提醒内容>" }

`;

        let nowDate = dayjs().format("YYYY-MM-DD");
        systemPrompt += "\n\n";
        systemPrompt += `今天的日期是：${nowDate}`;

        let txtResult = "";
        const start = dayjs().startOf("day").toISOString();
        const end = dayjs().endOf("day").toISOString();
        let list = await platform.instance.storage.getMattersByRange(start, end);
        console.log(`[NotificationManager] Found ${list.length} matters in time range`);
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

        let todoList = await platform.instance.storage.listTodos();
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

        let repeatTask = await platform.instance.storage.getActiveRepeatTasks();
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

        let baseUrl = aiConfig.baseUrl;
        let apiKey = aiConfig.apiKey;
        let model = aiConfig.modelId;

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
            console.error(`[NotificationManager] Failed to parse JSON: ${error}`);
        } finally {
            return true;
        }
    }

    private async processStandardNotifications(
        now: Date,
        matters: Matter[],
        forceCheck: boolean = true
    ): Promise<boolean> {
        // Check upcoming tasks
        let notifications = appConfig.getNotifications();
        let shouldCheckUpcoming = false;
        if (forceCheck) {
            shouldCheckUpcoming = await this.isUpcomingCheckDue();
        }
        if (shouldCheckUpcoming) {
            console.log(`[NotificationManager] Checking upcoming tasks at ${now.toLocaleDateString()}`);
            const notifyBefore = notifications.checkIntervalMinutes || 15;
            const upcomingNotifications = this.getUpcomingTaskNotifications(now, matters, notifyBefore);
            if (upcomingNotifications.length == 0) {
                console.log(`[NotificationManager] No upcoming tasks`);
            } else {
                console.log(`[NotificationManager] Found ${upcomingNotifications.length} upcoming tasks`);
                let notification = upcomingNotifications[0];
                this.onReceiveNotification(notification.title, notification.message, notification.notificationType);
                return true;
            }
        }

        let shouldCheckNoTasks = false;

        if (forceCheck) {
            shouldCheckNoTasks = await this.isNoTasksCheckDue();
        }

        if (shouldCheckNoTasks) {
            console.log(`[NotificationManager] Checking no tasks at ${now.toLocaleString()}`);
            if (this.hasNoScheduledTasksInTimeRange(now, matters)) {
                let title = get(_)("app.messages.noPlannedTasks");
                let message = get(_)("app.messages.noPlannedTasksDescription");
                this.onReceiveNotification(title, message, NotificationType.NoTask);
                return true;
            }
        }
        console.log(`[NotificationManager] No notification found`);
        return false;
    }

    private async createDueRepeatTasks(now: Date, existingMatters: Matter[]): Promise<Matter[]> {
        const repeatTasks = await platform.instance.storage.getActiveRepeatTasks();
        if (repeatTasks.length === 0) {
            console.log(`[NotificationManager] No active repeat tasks, skip`);
            return [];
        }
        const createdMatters: Matter[] = [];
        for (const task of repeatTasks) {
            if (!RepeatTaskHandler.isScheduledForToday(task, now)) {
                continue;
            }

            const taskExists = existingMatters.some((m) => m.reserved_2 === task.id);
            if (taskExists) {
                continue;
            }

            const storeKey = `repeat_task_${task.id}_${now.toISOString().split("T")[0]}`;
            // need sync
            const created = await appConfig.getStoredValue(storeKey, false);
            if (created === "1") {
                continue;
            }

            const timeRange = RepeatTaskHandler.getTaskTimeRange(task);
            if (timeRange) {
                const newMatter = RepeatTaskHandler.createDailyTaskInstance(task, now, timeRange);
                await platform.instance.storage.createMatter(newMatter);
                // need sync
                await appConfig.storeValue(storeKey, "1", false);
                createdMatters.push(newMatter);
            }
        }
        return createdMatters;
    }

    private getUpcomingTaskNotifications(
        currentTime: Date,
        matters: Matter[],
        notifyBeforeMinutes: number
    ): Notification[] {
        const notifications: Notification[] = [];

        for (const matter of matters) {
            const taskEndTime = new Date(matter.end_time);
            const taskStartTime = new Date(matter.start_time);

            const minutesUntilEnd = Math.floor((taskEndTime.getTime() - currentTime.getTime()) / (1000 * 60));
            const minutesUntilStart = Math.floor((taskStartTime.getTime() - currentTime.getTime()) / (1000 * 60));

            if (minutesUntilEnd <= notifyBeforeMinutes && minutesUntilEnd > 0) {
                let notificationTitle = get(_)("app.messages.taskEndingSoon");
                let notificationMessage = get(_)("app.messages.taskEndingSoonDescription", {
                    values: { title: matter.title, minutes: minutesUntilEnd },
                });
                notifications.push({
                    id: crypto.randomUUID(),
                    title: notificationTitle,
                    message: notificationMessage,
                    timestamp: currentTime.toISOString(),
                    notificationType: NotificationType.TaskEnd,
                });
            } else if (minutesUntilStart <= notifyBeforeMinutes && minutesUntilStart >= 0) {
                let notificationTitle = get(_)("app.messages.taskStartingSoon");
                let notificationMessage = get(_)("app.messages.taskStartingSoonDescription", {
                    values: { title: matter.title, minutes: minutesUntilStart },
                });
                notifications.push({
                    id: crypto.randomUUID(),
                    title: notificationTitle,
                    message: notificationMessage,
                    timestamp: currentTime.toISOString(),
                    notificationType: NotificationType.TaskStart,
                });
            }
        }

        return notifications;
    }

    private hasNoScheduledTasksInTimeRange(currentTime: Date, matters: Matter[]): boolean {
        const twoHoursFromNow = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000);

        return !matters.some((matter) => {
            const taskStartTime = new Date(matter.start_time);
            const taskEndTime = new Date(matter.end_time);
            return (
                (taskStartTime >= currentTime && taskStartTime <= twoHoursFromNow) ||
                (taskStartTime <= currentTime && taskEndTime >= currentTime)
            );
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

    private async isUpcomingCheckDue(): Promise<boolean> {
        const key = "last_check_upcoming_task_time";
        return this.hasIntervalElapsedSinceLastCheck(key, 15);
    }

    private async isNoTasksCheckDue(): Promise<boolean> {
        const key = "last_check_no_task_time";
        let notifications = appConfig.getNotifications();
        const interval = notifications.checkIntervalMinutes || 120;
        return this.hasIntervalElapsedSinceLastCheck(key, interval);
    }

    private async isAINotificationCheckDue(): Promise<boolean> {
        const key = "last_check_ai_notification_time";
        let notifications = appConfig.getNotifications();
        const interval = notifications.checkIntervalMinutes || 120;
        return this.hasIntervalElapsedSinceLastCheck(key, interval);
    }

    private async hasIntervalElapsedSinceLastCheck(key: string, durationMinutes: number): Promise<boolean> {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // get from local storage
        const updateTimeStr = (await appConfig.getStoredValue(key, true)) || todayStart.toISOString();

        const updateTime = new Date(updateTimeStr);
        const minutes = Math.floor((now.getTime() - updateTime.getTime()) / (1000 * 60));

        // notification check interval, save to local storage
        if (minutes > durationMinutes) {
            await appConfig.storeValue(key, now.toISOString(), true);
            return true;
        }
        console.log(`[NotificationManager] ${key} update time not exceed ${durationMinutes} minutes, skip check`);
        return false;
    }
}

export const notificationManager = NotificationManager.getInstance();

export default notificationManager;
