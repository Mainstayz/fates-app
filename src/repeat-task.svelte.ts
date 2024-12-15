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
        this.allTags = tags.map((tag: { name: string }) => tag.name).filter((tag: string) => tag !== "");
    }

    public async fetchData() {
        this.data = await getAllRepeatTasks();
    }

    public async createRepeatTask(task: RepeatTask) {
        const newTask = await createRepeatTask(task);
        this.data.unshift(newTask);
    }

    public async updateRepeatTask(task: RepeatTask) {
        // const newTask = await updateRepeatTask(task);
        // this.data.unshift(newTask);
    }

    public async deleteRepeatTask(taskId: string) {
        await deleteRepeatTask(taskId);
        let index = this.data.findIndex((task) => task.id === taskId);
        if (index !== -1) {
            this.data.splice(index, 1);
        }
    }
}

export const repeatTaskAPI = new RepeatTaskAPI();
