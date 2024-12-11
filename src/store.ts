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

const post = async (url: string, body: any) => {
    const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
        },
    });
    return response.json();
};

const get = async (url: string) => {
    const response = await fetch(url);
    return response.json();
};

const put = async (url: string, body: any) => {
    const response = await fetch(url, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
        },
    });
    return response.json();
};

const delete_ = async (url: string) => {
    const response = await fetch(url, {
        method: "DELETE",
    });
    return response.json();
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
export const createTag = async (name: string) => {
    const url = `${API_BASE_URL}/tags`;
    const response = await post(url, { name });
    return processResponse(url, response);
};

export const getAllTags = async () => {
    const url = `${API_BASE_URL}/tags`;
    const response = await get(url);
    return processResponse(url, response);
};

export const deleteTag = async (name: string) => {
    const url = `${API_BASE_URL}/tags/${name}`;
    const response = await delete_(url);
    return processResponse(url, response);
};
