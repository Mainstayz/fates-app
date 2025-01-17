import type { Matter, Todo } from "./types";
import platform from "./platform";
import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";
import { NOTIFICATION_RELOAD_TIMELINE_DATA, REFRESH_TIME_PROGRESS } from "$src/config";

export class TodoScheduler {
    private timer: ReturnType<typeof setInterval> | null = null;

    // 启动定时任务
    start() {
        if (this.timer) {
            return;
        }
        // 每天凌晨执行一次
        this.timer = setInterval(async () => {
            await this.processTodayTodos();
        }, 1 * 60 * 1000);

        // 立即执行一次
        this.processTodayTodos();

        // 清除过期 kv
        this.clearKV();


    }

    // 停止定时任务
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private async processTodayTodos() {
        try {
            const todos = await this.getTodayTodos();
            if (!todos.length) {
                console.log("[TodoScheduler] No todos to process today");
                return;
            }

            for (const todo of todos) {
                await this.processOneTodo(todo);
            }
        } catch (error) {
            console.error("[TodoScheduler] Process today todos error:", error);
        }
    }

    private async getTodayTodos(): Promise<Todo[]> {
        const allTodos = await platform.instance.storage.listTodos();
        const today = dayjs().format("YYYY-MM-DD");

        return allTodos.filter((todo) => {
            return todo.status === "todo" && todo.start_time?.startsWith(today);
        });
    }

    private async processOneTodo(todo: Todo) {
        const now = dayjs();
        const today = now.format("YYYYMMDD");
        const kvKey = `${today}_todo_${todo.id}`;

        // 检查是否已经创建过
        const existingKV = await platform.instance.storage.getKV(kvKey, false);
        if (existingKV) {
            console.log("[TodoScheduler] Todo already created today");
            return;
        }

        //
        let start_time = dayjs(todo.start_time);
        let end_time = start_time.add(2, "hour");

        // 创建 Matter
        const matter: Matter = {
            id: uuidv4(),
            title: todo.title,
            type_: 2, // todo item
            start_time: start_time.toISOString(),
            end_time: end_time.toISOString(),
            priority: 0,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            reserved_1: "blue",
            reserved_2: todo.id, // 关联到 todo item
        };

        console.log("[TodoScheduler] Create matter:", matter);
        await platform.instance.storage.createMatter(matter);

        // emit
        await Promise.all([
            platform.instance.event.emit(NOTIFICATION_RELOAD_TIMELINE_DATA, {}),
            platform.instance.event.emit(REFRESH_TIME_PROGRESS, {}),
        ]);

        // 记录创建状态
        console.log("[TodoScheduler] Set kv:", kvKey, "created", false);
        await platform.instance.storage.setKV(kvKey, "created", false);
    }

    // clear kv
    private async clearKV() {
        console.log("[DBCleaner] Clear kv ...");
        let now = dayjs();
        {
            let today = now.format("YYYY-MM-DD");
            let todayDate = dayjs(today);
            const kv = await platform.instance.storage.getKVByRegex(`^repeat_task*.+`, false);
            if (Object.keys(kv).length > 0) {
                for (const key in kv) {
                    let taskDate = key.split("_").pop();
                    let taskDateObj = dayjs(taskDate);
                    if (taskDateObj.isBefore(todayDate)) {
                        console.log("[DBCleaner] Clear kv:", key, taskDate);
                        await platform.instance.storage.deleteKV(key);
                    } else {
                        console.log("[DBCleaner] Keep kv:", key, taskDate);
                    }
                }
            } else {
                console.log("[DBCleaner] No repeat task kv to clear");
            }
        }
    }
}

export const todoScheduler = new TodoScheduler();
