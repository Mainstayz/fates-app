import { Priority } from "$lib/types";
import {
    getAllRepeatTasks,
    createRepeatTask,
    updateRepeatTask,
    deleteRepeatTask,
    createTag,
    getAllTags,
    createMatter,
} from "../store";

import type { RepeatTask, Matter } from "../store";
import { v4 as uuidv4 } from "uuid";

class RepeatTaskAPI {
    public data = $state<RepeatTask[]>([]);
    public allTags = $state<string[]>([]);

    public async fetchAllTags() {
        let tags = await getAllTags();
        let newTags = tags.map((tag: { name: string }) => tag.name).filter((tag: string) => tag !== "");
        console.log("allTags: ", newTags);
        this.allTags.length = 0;
        this.allTags.push(...newTags);
    }

    public async fetchData() {
        this.data = await getAllRepeatTasks();
    }

    public async createRepeatTask(task: RepeatTask) {
        const newTask = await createRepeatTask(task);
        this.data.unshift(newTask);
    }

    public getRepeatTaskById(taskId: string): RepeatTask | undefined {
        return this.data.find((task) => task.id === taskId);
    }

    public async updateRepeatTask(task: RepeatTask) {
        let taskId = task.id;
        const newTask = await updateRepeatTask(taskId, task);
        let index = this.data.findIndex((task) => task.id === taskId);
        if (index !== -1) {
            this.data[index] = newTask;
        }
    }

    public async deleteRepeatTask(taskId: string) {
        await deleteRepeatTask(taskId);
        let index = this.data.findIndex((task) => task.id === taskId);
        if (index !== -1) {
            this.data.splice(index, 1);
        }
    }
    public async createTagsIfNotExist(tags: string) {
        await createTag(tags);
        await this.fetchAllTags();
    }

    public async createMatter(repeatTask: RepeatTask) {
        let components = repeatTask.repeat_time.split("|");
        if (components.length !== 3) {
            console.error("repeat_time format error", repeatTask.repeat_time);
            return;
        }
        let now = new Date();

        let startTime = components[1]; // 08:00
        let endTime = components[2]; // 10:00

        let startTimeLocal = new Date();
        startTimeLocal.setHours(parseInt(startTime.split(":")[0]));
        startTimeLocal.setMinutes(parseInt(startTime.split(":")[1]));

        let endTimeLocal = new Date();
        endTimeLocal.setHours(parseInt(endTime.split(":")[0]));
        endTimeLocal.setMinutes(parseInt(endTime.split(":")[1]));
        let color = "";
        switch (repeatTask.priority) {
            case Priority.Low:
                color = "green";
                break;
            case Priority.Medium:
                color = "blue";
                break;
            case Priority.High:
                color = "red";
                break;
            default:
                color = "blue";
                break;
        }

        const matter: Matter = {
            id: uuidv4(),
            title: repeatTask.title,
            description: repeatTask.description || "",
            tags: repeatTask.tags || "",
            start_time: startTimeLocal.toISOString(),
            end_time: endTimeLocal.toISOString(),
            priority: repeatTask.priority,
            type_: 1, // 循环任务
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            reserved_1: color,
            reserved_2: repeatTask.id,
        };

        try {
            await createMatter(matter);
            console.log("Matter created successfully");
        } catch (error) {
            console.error("Failed to create matter:", error);
        }
    }
}

export const repeatTaskAPI = new RepeatTaskAPI();
