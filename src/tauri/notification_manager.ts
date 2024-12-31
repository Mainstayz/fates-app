import "../i18n/i18n";
import type { Matter, RepeatTask, Todo } from "../store";
import { getActiveRepeatTasks, getMattersByRange, createMatter, getKV, setKV, getAllTodos } from "../store";
import { isHolidayDate } from "../i18n/holiday-cn";
import { _, locale } from "svelte-i18n";
import { get } from "svelte/store";
import {
    SETTING_KEY_AI_ENABLED,
    SETTING_KEY_AI_BASE_URL,
    SETTING_KEY_AI_API_KEY,
    SETTING_KEY_AI_MODEL_ID,
    SETTING_KEY_LANGUAGE,
    SETTING_KEY_WORK_START_TIME,
    SETTING_KEY_WORK_END_TIME,
    SETTING_KEY_NOTIFICATION_CHECK_INTERVAL,
    SETTING_KEY_NOTIFY_BEFORE_MINUTES,
    SETTING_KEY_AI_REMINDER_PROMPT,
} from "../config";
import { OpenAIClient } from "$src/features/openai";
import dayjs from "dayjs";
import { generateDescription, parseRepeatTimeString } from "$src/lib/utils/repeatTime";
import { v4 as uuidv4 } from "uuid";
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
        console.log("Start notification loop ...");
        this.checkInterval = setInterval(async () => {
            console.log(`Checking notifications at ${new Date().toLocaleString()}`);
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
            console.log(
                `SKIPPED!!! Not in work hours, start time: ${this.config.workStartTime}, end time: ${this.config.workEndTime}`
            );
            return;
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
            // 创建通知，通知类型为 NewTask
            let title = get(_)("app.messages.newRepeatTasks");
            let message = get(_)("app.messages.newRepeatTasksDescription", {
                values: { count: createdMatters.length },
            });
            this.onReceiveNotification(title, message, NotificationType.NewTask);
            return;
        }

        let aiEnabled = await getKV(SETTING_KEY_AI_ENABLED);
        console.log("AI enabled:", aiEnabled);
        if (aiEnabled === "true") {
            this.startAINotificationCheck(now, matters);
        } else {
            this.startNormalNotificationCheck(now, matters);
        }
    }

    private async startAINotificationCheck(now: Date, matters: Matter[], ignoreRestriction: boolean = false) {
        if (!ignoreRestriction) {
            let isInTaskTimeRange = false;
            for (const matter of matters) {
                // 将 ISO 字符串转换为本地时间
                const startTime = dayjs(matter.start_time).toDate();
                const endTime = dayjs(matter.end_time).toDate();
                console.log(`检查任务时间范围：${matter.title}`);
                console.log(`- 开始时间：${startTime.toLocaleString()}`);
                console.log(`- 结束时间：${endTime.toLocaleString()}`);
                console.log(`- 当前时间：${now.toLocaleString()}`);
                if (now >= startTime && now <= endTime) {
                    console.log("- 当前时间在任务时间范围内");
                    isInTaskTimeRange = true;
                    break;
                } else {
                    console.log("- 当前时间不在任务时间范围内");
                }
            }
            if (isInTaskTimeRange) {
                console.log("当前时间在任务时间范围内，不需要开始 AI 通知逻辑，跳过");
                return;
            }

            let shouldCheck = await this.shouldCheckAINotification();
            if (!shouldCheck) {
                console.log("不需要开始 AI 通知逻辑，跳过");
                return;
            }
        }
        let aiReminderPrompt = await getKV(SETTING_KEY_AI_REMINDER_PROMPT);
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

        let baseUrl = await getKV(SETTING_KEY_AI_BASE_URL);
        let apiKey = await getKV(SETTING_KEY_AI_API_KEY);
        let model = await getKV(SETTING_KEY_AI_MODEL_ID);

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
        }
    }

    private async startNormalNotificationCheck(now: Date, matters: Matter[]) {
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

    private async shouldCheckAINotification(): Promise<boolean> {
        const key = "last_check_ai_notification_time";
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
        console.log(`${key} 更新时间未超过 ${durationMinutes} 分钟，跳过检查`);
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
