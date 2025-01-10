import type { PlatformAPI } from "./index";
import type { Matter, NotificationRecord, Todo, Tag, RepeatTask } from "$src/types";

class WebEvent {
    async emit(event: string, data: any): Promise<void> {
        return;
    }
    async listen(event: string): Promise<() => void> {
        return () => {};
    }
}

class WebClipboard {
    async writeText(text: string): Promise<void> {
        return;
    }
}

class WebAutostart {
    async enable(): Promise<void> {
        return;
    }
    async disable(): Promise<void> {
        return;
    }
    async isEnabled(): Promise<boolean> {
        return false;
    }
}

class WebStorage {
    private prefix = "fates_";

    private getKey(key: string): string {
        return this.prefix + key;
    }

    async getMatter(id: string): Promise<Matter | null> {
        const data = localStorage.getItem(this.getKey(`matter_${id}`));
        return data ? JSON.parse(data) : null;
    }

    async listMatters(): Promise<Matter[]> {
        const matters: Matter[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.getKey("matter_"))) {
                const data = localStorage.getItem(key);
                if (data) {
                    matters.push(JSON.parse(data));
                }
            }
        }
        return matters;
    }

    async createMatter(matter: Matter): Promise<void> {
        localStorage.setItem(this.getKey(`matter_${matter.id}`), JSON.stringify(matter));
    }

    async updateMatter(matter: Matter): Promise<void> {
        localStorage.setItem(this.getKey(`matter_${matter.id}`), JSON.stringify(matter));
    }

    async deleteMatter(id: string): Promise<void> {
        localStorage.removeItem(this.getKey(`matter_${id}`));
    }

    async queryMattersByField(field: string, value: string, exactMatch: boolean): Promise<Matter[]> {
        const matters = await this.listMatters();
        return matters.filter((matter) => {
            const fieldValue = matter[field as keyof Matter];
            if (typeof fieldValue === "string") {
                return exactMatch ? fieldValue === value : fieldValue.includes(value);
            }
            return false;
        });
    }

    async getMattersByRange(start: string, end: string): Promise<Matter[]> {
        const matters = await this.listMatters();
        return matters.filter((matter) => {
            return matter.start_time >= start && matter.end_time <= end;
        });
    }

    // KV 模块
    async setKV(key: string, value: string): Promise<void> {
        localStorage.setItem(this.getKey(`kv_${key}`), value);
    }

    async getKV(key: string): Promise<string | null> {
        return localStorage.getItem(this.getKey(`kv_${key}`));
    }

    async deleteKV(key: string): Promise<void> {
        localStorage.removeItem(this.getKey(`kv_${key}`));
    }

    // Tag 模块
    async createTag(name: string): Promise<void> {
        const tags = await this.getAllTags();
        const newTag = {
            name,
            last_used_at: new Date().toISOString(),
        };
        tags.push(newTag);
        localStorage.setItem(this.getKey("tags"), JSON.stringify(tags));
    }

    async getAllTags(): Promise<Tag[]> {
        const data = localStorage.getItem(this.getKey("tags"));
        return data ? JSON.parse(data) : [];
    }

    async deleteTag(name: string): Promise<void> {
        const tags = await this.getAllTags();
        const filteredTags = tags.filter((tag) => tag.name !== name);
        localStorage.setItem(this.getKey("tags"), JSON.stringify(filteredTags));
    }

    async updateTagLastUsedAt(name: string): Promise<void> {
        const tags = await this.getAllTags();
        const tagIndex = tags.findIndex((tag) => tag.name === name);
        if (tagIndex !== -1) {
            tags[tagIndex].last_used_at = new Date().toISOString();
            localStorage.setItem(this.getKey("tags"), JSON.stringify(tags));
        }
    }

    // Todo 模块
    async createTodo(todo: Todo): Promise<void> {
        localStorage.setItem(this.getKey(`todo_${todo.id}`), JSON.stringify(todo));
    }

    async getTodo(id: string): Promise<Todo | null> {
        const data = localStorage.getItem(this.getKey(`todo_${id}`));
        return data ? JSON.parse(data) : null;
    }

    async listTodos(): Promise<Todo[]> {
        const todos: Todo[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.getKey("todo_"))) {
                const data = localStorage.getItem(key);
                if (data) {
                    todos.push(JSON.parse(data));
                }
            }
        }
        return todos;
    }

    async updateTodo(id: string, todo: Todo): Promise<void> {
        localStorage.setItem(this.getKey(`todo_${id}`), JSON.stringify(todo));
    }

    async deleteTodo(id: string): Promise<void> {
        localStorage.removeItem(this.getKey(`todo_${id}`));
    }

    // RepeatTask 模块
    async createRepeatTask(task: RepeatTask): Promise<RepeatTask> {
        localStorage.setItem(this.getKey(`repeat_task_${task.id}`), JSON.stringify(task));
        return task;
    }

    async getRepeatTask(id: string): Promise<RepeatTask | null> {
        const data = localStorage.getItem(this.getKey(`repeat_task_${id}`));
        return data ? JSON.parse(data) : null;
    }

    async listRepeatTasks(): Promise<RepeatTask[]> {
        const tasks: RepeatTask[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.getKey("repeat_task_"))) {
                const data = localStorage.getItem(key);
                if (data) {
                    tasks.push(JSON.parse(data));
                }
            }
        }
        return tasks;
    }

    async getActiveRepeatTasks(): Promise<RepeatTask[]> {
        const tasks = await this.listRepeatTasks();
        return tasks.filter((task) => task.status === 1);
    }

    async updateRepeatTask(id: string, task: RepeatTask): Promise<RepeatTask> {
        localStorage.setItem(this.getKey(`repeat_task_${id}`), JSON.stringify(task));
        return task;
    }

    async deleteRepeatTask(id: string): Promise<void> {
        localStorage.removeItem(this.getKey(`repeat_task_${id}`));
    }

    async updateRepeatTaskStatus(id: string, status: number): Promise<void> {
        const task = await this.getRepeatTask(id);
        if (task) {
            task.status = status;
            await this.updateRepeatTask(id, task);
        }
    }

    // Notification 模块
    async getNotifications(): Promise<NotificationRecord[]> {
        const notifications: NotificationRecord[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.getKey("notification_"))) {
                const data = localStorage.getItem(key);
                if (data) {
                    notifications.push(JSON.parse(data));
                }
            }
        }
        return notifications;
    }

    async saveNotification(notification: NotificationRecord): Promise<void> {
        localStorage.setItem(this.getKey(`notification_${notification.id}`), JSON.stringify(notification));
    }

    async deleteNotification(id: string): Promise<void> {
        localStorage.removeItem(this.getKey(`notification_${id}`));
    }

    async getUnreadNotifications(): Promise<NotificationRecord[]> {
        const notifications = await this.getNotifications();
        return notifications.filter((notification) => !notification.read_at);
    }

    async markNotificationAsRead(id: string): Promise<void> {
        const notification = await this.getNotification(id);
        if (notification) {
            notification.read_at = new Date().toISOString();
            await this.saveNotification(notification);
        }
    }

    async markNotificationAsReadByType(type_: number): Promise<void> {
        const notifications = await this.getNotifications();
        for (const notification of notifications) {
            if (notification.type_ === type_ && !notification.read_at) {
                notification.read_at = new Date().toISOString();
                await this.saveNotification(notification);
            }
        }
    }

    async markAllNotificationsAsRead(): Promise<void> {
        const notifications = await this.getNotifications();
        for (const notification of notifications) {
            if (!notification.read_at) {
                notification.read_at = new Date().toISOString();
                await this.saveNotification(notification);
            }
        }
    }

    private async getNotification(id: string): Promise<NotificationRecord | null> {
        const data = localStorage.getItem(this.getKey(`notification_${id}`));
        return data ? JSON.parse(data) : null;
    }
}

class WebNotification {
    async show(title: string, body: string, options?: any): Promise<void> {
        if (!("Notification" in window)) {
            console.warn("This browser does not support notifications");
            return;
        }

        if (Notification.permission === "granted") {
            new Notification(title, { body, ...options });
        } else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                new Notification(title, { body, ...options });
            }
        }
    }

    async requestPermission(): Promise<"default" | "denied" | "granted"> {
        if (!("Notification" in window)) {
            return "default";
        }

        const permission = await Notification.requestPermission();
        return permission;
    }

    async isPermissionGranted(): Promise<boolean> {
        return Notification.permission === "granted";
    }

    async sendNotification(title: string, body: string): Promise<void> {
        new Notification(title, { body });
    }
}

class WebWindow {
    async minimize(): Promise<void> {
        console.warn("Window minimize is not supported in web version");
    }

    async maximize(): Promise<void> {
        console.warn("Window maximize is not supported in web version");
    }

    async close(): Promise<void> {
        console.warn("Window close is not supported in web version");
    }

    async show(): Promise<void> {
        console.warn("Window show is not supported in web version");
    }

    async hide(): Promise<void> {
        console.warn("Window hide is not supported in web version");
    }
}

const webPlatform: PlatformAPI = {
    event: new WebEvent(),
    clipboard: new WebClipboard(),
    storage: new WebStorage(),
    notification: new WebNotification(),
    window: new WebWindow(),
    autostart: new WebAutostart(),
    getVersion: () => Promise.resolve("1.0.0"),
    init: async () => {},
    destroy: async () => {},
};

export default webPlatform;
