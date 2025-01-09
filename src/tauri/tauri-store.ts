import { fetch } from "@tauri-apps/plugin-http";
import type { Matter, NotificationRecord, RepeatTask, Todo } from "$src/types";

interface RequestOptions {
    debug?: boolean;
}

function getApiBaseUrl() {
    // TODO: Custom api port
    return "http://localhost:8523";
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
    const url = `${getApiBaseUrl()}/matter`;
    const response = await post(url, matter, options);
    return processResponse(url, response);
};

export const getMatterById = async (id: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/matter/${id}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const getAllMatters = async (options?: RequestOptions): Promise<Matter[]> => {
    const url = `${getApiBaseUrl()}/matter`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const queryMattersByField = async (field: string, value: string, exact_match: boolean, options?: RequestOptions): Promise<Matter[]> => {
    const url = `${getApiBaseUrl()}/matter/query?field=${field}&value=${value}&exact_match=${exact_match}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const updateMatter = async (id: string, matter: Matter, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/matter/${id}`;
    const response = await put(url, matter, options);
    return processResponse(url, response);
};

export const deleteMatter = async (id: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/matter/${id}`;
    const response = await delete_(url, options);
    return processResponse(url, response);
};

export const getMattersByRange = async (start: string, end: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/matter/range?start=${start}&end=${end}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

// KVStore API
export const setKV = async (key: string, value: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/kv/${key}`;
    await fetch(url, {
        method: "PUT",
        body: value,
    });
};

export const getKV = async (key: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/kv/${key}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const deleteKV = async (key: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/kv/${key}`;
    const response = await delete_(url, options);
    return processResponse(url, response);
};

// Tag API
export const createTag = async (names: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/tags`;
    const response = await post(url, {
        names: names
    }, options);
    return processResponse(url, response);
};

export const getAllTags = async (options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/tags`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const deleteTag = async (names: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/tags/${names}`;
    const response = await delete_(url, options);
    return processResponse(url, response);
};

export const updateTagLastUsedAt = async (names: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/tags/update/${names}`;
    const response = await put(url, {}, options);
    return processResponse(url, response);
};

// RepeatTask API
export const createRepeatTask = async (task: RepeatTask, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/repeat-task`;
    const response = await post(url, task, options);
    return processResponse(url, response);
};

export const getRepeatTaskById = async (id: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/repeat-task/${id}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const getAllRepeatTasks = async (options?: RequestOptions): Promise<RepeatTask[]> => {
    const url = `${getApiBaseUrl()}/repeat-task`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const getActiveRepeatTasks = async (options?: RequestOptions): Promise<RepeatTask[]> => {
    const url = `${getApiBaseUrl()}/repeat-task/active`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const updateRepeatTask = async (id: string, task: RepeatTask, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/repeat-task/${id}`;
    const response = await put(url, task, options);
    return processResponse(url, response);
};

export const deleteRepeatTask = async (id: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/repeat-task/${id}`;
    const response = await delete_(url, options);
    return processResponse(url, response);
};

export const updateRepeatTaskStatus = async (id: string, status: number, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/repeat-task/${id}/status/${status}`;
    const response = await put(url, {}, options);
    return processResponse(url, response);
};

// Todo API
export const createTodo = async (todo: Todo, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/todo`;
    const response = await post(url, todo, options);
    return processResponse(url, response);
};

export const getTodoById = async (id: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/todo/${id}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const getAllTodos = async (options?: RequestOptions): Promise<Todo[]> => {
    const url = `${getApiBaseUrl()}/todo`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const updateTodo = async (id: string, todo: Todo, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/todo/${id}`;
    const response = await put(url, todo, options);
    return processResponse(url, response);
};

export const deleteTodo = async (id: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/todo/${id}`;
    const response = await delete_(url, options);
    return processResponse(url, response);
};

// Notification API
export const createNotification = async (notification: NotificationRecord, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/notification`;
    const response = await post(url, notification, options);
    return processResponse(url, response);
};

export const getNotificationById = async (id: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/notification/${id}`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const getUnreadNotifications = async (options?: RequestOptions): Promise<NotificationRecord[]> => {
    const url = `${getApiBaseUrl()}/notification/unread`;
    const response = await get(url, options);
    return processResponse(url, response);
};

export const updateNotification = async (id: string, notification: NotificationRecord, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/notification/${id}`;
    const response = await put(url, notification, options);
    return processResponse(url, response);
};

export const deleteNotification = async (id: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/notification/${id}`;
    const response = await delete_(url, options);
    return processResponse(url, response);
};

export const markNotificationAsRead = async (id: string, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/notification/${id}/read`;
    const response = await put(url, {}, options);
    return processResponse(url, response);
};

export const markNotificationAsReadByType = async (type_: number, options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/notification/read/${type_}`;
    const response = await put(url, {}, options);
    return processResponse(url, response);
};

export const markAllNotificationsAsRead = async (options?: RequestOptions) => {
    const url = `${getApiBaseUrl()}/notification/read-all`;
    const response = await put(url, {}, options);
    return processResponse(url, response);
};
