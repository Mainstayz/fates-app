import {
    getAllRepeatTasks,
    createRepeatTask,
    updateRepeatTask,
    deleteRepeatTask,
    createTag,
    getAllTags,

} from "./store";

import type { RepeatTask } from "./store";

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
}

export const repeatTaskAPI = new RepeatTaskAPI();
