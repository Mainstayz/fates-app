export interface Matter {
    id: string;
    title: string;
    description?: string;
    tags?: string;
    start_time: string;
    end_time: string;
    priority: number;
    type_: number; // 0: normal task, 1: repeat task, 2: todo range item 3: todo item
    created_at: string;
    updated_at: string;
    reserved_1?: string; // for className
    reserved_2?: string; // assigned repeat task id  or  todo item id
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
    start_time?: string;
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
