import { fetch } from "@tauri-apps/plugin-http";
import config from "./config";

const API_BASE_URL = config.apiBaseUrl;
// 定义接口
export interface Matter {
    id: string;
    title: string;
    description?: string;
    tags?: string;
    start_time: string;
    end_time: string;
    priority: number;
    type_: number;
    created_at: string;
    updated_at: string;
    reserved_1?: string; // 用于 className
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

const post = async (url: string, body: any) => {
    // console.log(`=====> POST ${url} , body: ${JSON.stringify(body)}`);
    const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
        },
    });
    const responseText = await response.text();
    // console.log(`<==== POST ${url} , response: ${responseText}`);
    return JSON.parse(responseText);
};

const get = async (url: string) => {
    // console.log(`=====> GET ${url}`);
    const response = await fetch(url);
    const responseText = await response.text();
    // console.log(`<==== GET ${url} , response: ${responseText}`);
    return JSON.parse(responseText);
};

const put = async (url: string, body: any) => {
    // console.log(`=====> PUT ${url} , body: ${JSON.stringify(body)}`);
    const response = await fetch(url, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
        },
    });
    const responseText = await response.text();
    // console.log(`<==== PUT ${url} , response: ${responseText}`);
    return JSON.parse(responseText);
};

const delete_ = async (url: string) => {
    // console.log(`=====> DELETE ${url}`);
    const response = await fetch(url, {
        method: "DELETE",
    });
    const responseText = await response.text();
    // console.log(`<==== DELETE ${url} , response: ${responseText}`);
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
export const createMatter = async (matter: Matter) => {
    const url = `${API_BASE_URL}/matter`;
    const response = await post(url, matter);
    return processResponse(url, response);
};

export const getMatterById = async (id: string) => {
    const url = `${API_BASE_URL}/matter/${id}`;
    const response = await get(url);
    return processResponse(url, response);
};

export const getAllMatters = async (): Promise<Matter[]> => {
    const url = `${API_BASE_URL}/matter`;
    const response = await get(url);
    return processResponse(url, response);
};

export const updateMatter = async (id: string, matter: Matter) => {
    const url = `${API_BASE_URL}/matter/${id}`;
    const response = await put(url, matter);
    return processResponse(url, response);
};

export const deleteMatter = async (id: string) => {
    const url = `${API_BASE_URL}/matter/${id}`;
    const response = await delete_(url);
    return processResponse(url, response);
};

export const getMattersByRange = async (start: string, end: string) => {
    const url = `${API_BASE_URL}/matter/range?start=${start}&end=${end}`;
    const response = await get(url);
    return processResponse(url, response);
};

// KVStore API
export const setKV = async (key: string, value: string) => {
    const url = `${API_BASE_URL}/kv/${key}`;
    const response = await put(url, { value });
    return processResponse(url, response);
};

export const getKV = async (key: string) => {
    const url = `${API_BASE_URL}/kv/${key}`;
    const response = await get(url);
    return processResponse(url, response);
};

export const deleteKV = async (key: string) => {
    const url = `${API_BASE_URL}/kv/${key}`;
    const response = await delete_(url);
    return processResponse(url, response);
};

// Tag API
export const createTag = async (names: string) => {
    const url = `${API_BASE_URL}/tags`;
    const response = await post(url, {
        names: names
    });
    return processResponse(url, response);
};

export const getAllTags = async () => {
    const url = `${API_BASE_URL}/tags`;
    const response = await get(url);
    return processResponse(url, response);
};

export const deleteTag = async (names: string) => {
    const url = `${API_BASE_URL}/tags/${names}`;
    const response = await delete_(url);
    return processResponse(url, response);
};

export const updateTagLastUsedAt = async (names: string) => {
    const url = `${API_BASE_URL}/tags/update/${names}`;
    const response = await put(url, {});
    return processResponse(url, response);
};

// RepeatTask API
export const createRepeatTask = async (task: RepeatTask) => {
    const url = `${API_BASE_URL}/repeat-task`;
    const response = await post(url, task);
    return processResponse(url, response);
};

export const getRepeatTaskById = async (id: string) => {
    const url = `${API_BASE_URL}/repeat-task/${id}`;
    const response = await get(url);
    return processResponse(url, response);
};

export const getAllRepeatTasks = async (): Promise<RepeatTask[]> => {
    const url = `${API_BASE_URL}/repeat-task`;
    const response = await get(url);
    return processResponse(url, response);
};

export const getActiveRepeatTasks = async (): Promise<RepeatTask[]> => {
    const url = `${API_BASE_URL}/repeat-task/active`;
    const response = await get(url);
    return processResponse(url, response);
};

export const updateRepeatTask = async (id: string, task: RepeatTask) => {
    const url = `${API_BASE_URL}/repeat-task/${id}`;
    const response = await put(url, task);
    return processResponse(url, response);
};

export const deleteRepeatTask = async (id: string) => {
    const url = `${API_BASE_URL}/repeat-task/${id}`;
    const response = await delete_(url);
    return processResponse(url, response);
};

export const updateRepeatTaskStatus = async (id: string, status: number) => {
    const url = `${API_BASE_URL}/repeat-task/${id}/status/${status}`;
    const response = await put(url, {});
    return processResponse(url, response);
};
