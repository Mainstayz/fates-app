import { fetch } from "@tauri-apps/plugin-http";
import config from "./config";

const API_BASE_URL = config.apiBaseUrl;

interface RequestOptions {
    debug?: boolean;
}

// Debug utility
const debug = (message: string, options?: RequestOptions) => {
    if (options?.debug) {
        console.log(message);
    }
};

// HTTP utilities with debug logging
const post = async (url: string, body: any, options?: RequestOptions) => {
    debug(`⏳ POST ${url} , body: ${JSON.stringify(body)}`, options);
    const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
        },
    });
    const responseText = await response.text();
    debug(`ℹ️ POST ${url} , response: ${responseText}`, options);
    return JSON.parse(responseText);
};

const get = async (url: string, options?: RequestOptions) => {
    debug(`⏳ GET ${url}`, options);
    const response = await fetch(url);
    const responseText = await response.text();
    debug(`ℹ️ GET ${url} , response: ${responseText}`, options);
    return JSON.parse(responseText);
};

const put = async (url: string, body: any, options?: RequestOptions) => {
    debug(`⏳ PUT ${url} , body: ${JSON.stringify(body)}`, options);
    const response = await fetch(url, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
        },
    });
    const responseText = await response.text();
    debug(`ℹ️ PUT ${url} , response: ${responseText}`, options);
    return JSON.parse(responseText);
};

const delete_ = async (url: string, options?: RequestOptions) => {
    debug(`⏳ DELETE ${url}`, options);
    const response = await fetch(url, {
        method: "DELETE",
    });
    const responseText = await response.text();
    debug(`ℹ️ DELETE ${url} , response: ${responseText}`, options);
    return JSON.parse(responseText);
};

export interface Matter {
    id: string;
    title: string;
    description?: string;
    tags?: string;
    start_time: string;
    end_time: string;
    priority: number;
    type_: number; // 0: normal task, 1: repeat task, 2: todo item
    created_at: string;
    updated_at: string;
    reserved_1?: string; // for className
    reserved_2?: string;
    reserved_3?: string;
    reserved_4?: string;
    reserved_5?: string;
}

export interface RepeatTask {
    id: string;
    title: string;
    tags?: string;
    repeat_time: string;
    status: number;
    created_at: string;
    updated_at: string;
    priority: number;
    description?: string;
}

export interface Todo {
    id: string;
    title: string;
    status: string; // "todo", "in_progress", "completed"
    created_at: string;
    updated_at: string;
}

export interface NotificationRecord {
    id: string;
    title: string;
    content: string;
    type_: number;
    status: number;
    related_task_id?: string;
    created_at: string;
    read_at?: string;
    expire_at?: string;
    action_url?: string;
    reserved_1?: string;
    reserved_2?: string;
    reserved_3?: string;
    reserved_4?: string;
    reserved_5?: string;
}

export interface Tag {
    name: string;
    last_used_at: string;
}

const processResponse = async (url: string, response: { code: number; msg: string; data: any }) => {
    if (response.code === 200) {
        return response.data;
    } else {
        const errMsg = `ERROR! url: ${url}, code: ${response.code}, msg: ${response.msg}`;
        console.error(errMsg);
        throw new Error(errMsg);
    }
};

// Matter API
export const createMatter = async (matter: Matter, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/matter`;
    const response = await post(url, matter, options);
    return processResponse(url, response);
};

export const getMatterById = async (id: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/matter/${id}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const getAllMatters = async (options?: RequestOptions): Promise<Matter[]> => {
    const url = `${API_BASE_URL}/matter`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const queryMattersByField = async (field: string, value: string, exact_match: boolean, options?: RequestOptions): Promise<Matter[]> => {
    const url = `${API_BASE_URL}/matter/query?field=${field}&value=${value}&exact_match=${exact_match}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const updateMatter = async (id: string, matter: Matter, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/matter/${id}`;
    const response = await put(url, matter, options);
    return processResponse(url, response);
};

export const deleteMatter = async (id: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/matter/${id}`;
    const response = await delete_(url, options);
    return processResponse(url, response);
};

export const getMattersByRange = async (start: string, end: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/matter/range?start=${start}&end=${end}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

// KVStore API
export const setKV = async (key: string, value: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/kv/${key}`;
    await fetch(url, {
        method: "PUT",
        body: value,
    });
};

export const getKV = async (key: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/kv/${key}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const deleteKV = async (key: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/kv/${key}`;
    const response = await delete_(url, options);
    return processResponse(url, response);
};

// Tag API
export const createTag = async (names: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/tags`;
    const response = await post(url, {
        names: names
    }, options);
    return processResponse(url, response);
};

export const getAllTags = async (options?: RequestOptions) => {
    const url = `${API_BASE_URL}/tags`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const deleteTag = async (names: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/tags/${names}`;
    const response = await delete_(url, options);
    return processResponse(url, response);
};

export const updateTagLastUsedAt = async (names: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/tags/update/${names}`;
    const response = await put(url, {}, options);
    return processResponse(url, response);
};

// RepeatTask API
export const createRepeatTask = async (task: RepeatTask, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/repeat-task`;
    const response = await post(url, task, options);
    return processResponse(url, response);
};

export const getRepeatTaskById = async (id: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/repeat-task/${id}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const getAllRepeatTasks = async (options?: RequestOptions): Promise<RepeatTask[]> => {
    const url = `${API_BASE_URL}/repeat-task`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const getActiveRepeatTasks = async (options?: RequestOptions): Promise<RepeatTask[]> => {
    const url = `${API_BASE_URL}/repeat-task/active`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const updateRepeatTask = async (id: string, task: RepeatTask, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/repeat-task/${id}`;
    const response = await put(url, task, options);
    return processResponse(url, response);
};

export const deleteRepeatTask = async (id: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/repeat-task/${id}`;
    const response = await delete_(url, options);
    return processResponse(url, response);
};

export const updateRepeatTaskStatus = async (id: string, status: number, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/repeat-task/${id}/status/${status}`;
    const response = await put(url, {}, options);
    return processResponse(url, response);
};

// Todo API
export const createTodo = async (todo: Todo, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/todo`;
    const response = await post(url, todo, options);
    return processResponse(url, response);
};

export const getTodoById = async (id: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/todo/${id}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const getAllTodos = async (options?: RequestOptions): Promise<Todo[]> => {
    const url = `${API_BASE_URL}/todo`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const updateTodo = async (id: string, todo: Todo, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/todo/${id}`;
    const response = await put(url, todo, options);
    return processResponse(url, response);
};

export const deleteTodo = async (id: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/todo/${id}`;
    const response = await delete_(url, options);
    return processResponse(url, response);
};

// Notification API
export const createNotification = async (notification: NotificationRecord, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/notification`;
    const response = await post(url, notification, options);
    return processResponse(url, response);
};

export const getNotificationById = async (id: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/notification/${id}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const getUnreadNotifications = async (options?: RequestOptions): Promise<NotificationRecord[]> => {
    const url = `${API_BASE_URL}/notification/unread`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const updateNotification = async (id: string, notification: NotificationRecord, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/notification/${id}`;
    const response = await put(url, notification, options);
    return processResponse(url, response);
};

export const deleteNotification = async (id: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/notification/${id}`;
    const response = await delete_(url, options);
    return processResponse(url, response);
};

export const markNotificationAsRead = async (id: string, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/notification/${id}/read`;
    const response = await put(url, {}, options);
    return processResponse(url, response);
};

export const markNotificationAsReadByType = async (type_: number, options?: RequestOptions) => {
    const url = `${API_BASE_URL}/notification/read/${type_}`;
    const response = await put(url, {}, options);
    return processResponse(url, response);
};

export const markAllNotificationsAsRead = async (options?: RequestOptions) => {
    const url = `${API_BASE_URL}/notification/read-all`;
    const response = await put(url, {}, options);
    return processResponse(url, response);
};
