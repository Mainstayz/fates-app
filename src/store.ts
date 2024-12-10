import axios from "axios";
import config from "./config";

const API_BASE_URL = config.apiBaseUrl;
// 定义接口
interface Matter {
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
    reserved_1?: string;
    reserved_2?: string;
    reserved_3?: string;
    reserved_4?: string;
    reserved_5?: string;
}

// Matter API
export const createMatter = async (matter: Matter) => {
    const response = await axios.post(`${API_BASE_URL}/matter`, matter);
    return response.data;
};

export const getMatterById = async (id: string) => {
    const response = await axios.get(`${API_BASE_URL}/matter/${id}`);
    return response.data;
};

export const getAllMatters = async () => {
    const response = await axios.get(`${API_BASE_URL}/matter`);
    return response.data;
};

export const updateMatter = async (id: string, matter: Matter) => {
    const response = await axios.put(`${API_BASE_URL}/matter/${id}`, matter);
    return response.data;
};

export const deleteMatter = async (id: string) => {
    const response = await axios.delete(`${API_BASE_URL}/matter/${id}`);
    return response.data;
};

export const getMattersByRange = async (start: string, end: string) => {
    const response = await axios.get(`${API_BASE_URL}/matter/range`, {
        params: { start, end },
    });
    return response.data;
};

// KVStore API
export const setKV = async (key: string, value: string) => {
    const response = await axios.put(`${API_BASE_URL}/kv/${key}`, { value });
    return response.data;
};

export const getKV = async (key: string) => {
    const response = await axios.get(`${API_BASE_URL}/kv/${key}`);
    return response.data;
};

export const deleteKV = async (key: string) => {
    const response = await axios.delete(`${API_BASE_URL}/kv/${key}`);
    return response.data;
};

// Tag API
export const createTag = async (name: string) => {
    const response = await axios.post(`${API_BASE_URL}/tags`, { name });
    return response.data;
};

export const getAllTags = async () => {
    const response = await axios.get(`${API_BASE_URL}/tags`);
    return response.data;
};

export const deleteTag = async (name: string) => {
    const response = await axios.delete(`${API_BASE_URL}/tags/${name}`);
    return response.data;
};
